<?php

namespace UWMadison\CalendarQuestions;

use ExternalModules\AbstractExternalModule;
use REDCap;

class CalendarQuestions extends AbstractExternalModule
{
    /*
    Redcap Hook, loads config page customizations
    */
    public function redcap_every_page_top($project_id)
    {
        if (!$this->isPage('ExternalModules/manager/project.php') || empty($project_id))
            return;
        $this->loadSettings([], true);
        $this->includeCSS();
        $this->includeJs('config.js');
    }

    /*
    Redcap Data Entry Form Hook
    */
    public function redcap_data_entry_form($project_id, $record, $instrument, $event_id)
    {
        $this->renderCalendar($project_id, $record, $instrument, $event_id);
    }

    /*
    Redcap Survey Page Hook
    */
    public function redcap_survey_page($project_id, $record, $instrument, $event_id)
    {
        $this->renderCalendar($project_id, $record, $instrument, $event_id);
    }

    /*
    Primary render handler for both data entry forms and surveys
    */
    private function renderCalendar($project_id, $record, $instrument, $event_id)
    {
        $settings = $this->getProjectSettings($project_id);
        $fields = REDCap::getFieldNames($instrument);
        if (empty($fields) || empty($settings['name'])) return;

        $calendars = [];
        $calNames = $settings['name'] ?? [];

        foreach ($calNames as $index => $field) {
            if (empty($field) || !in_array($field, $fields))
                continue;

            // Issue #3: Check event scoping if specified
            $calEvent = $settings['event'][$index] ?? null;
            if (!empty($calEvent) && !empty($event_id) && $calEvent != $event_id)
                continue;

            $calendars[$field] = [
                'json' => "{}",
                'noFuture' => !empty($settings['nofuture'][$index]),
                'stats' => !empty($settings['stats'][$index]),
                'compress' => !empty($settings['compress'][$index]),
                'alwaysShowData' => !empty($settings['always-show-data'][$index]),
                'questions' => [],
                'range' => [],
                'buttons' => []
            ];

            // Grab calendar question settings
            $questions = $settings['question'][$index] ?? [];
            foreach ($questions as $qindex => $question) {
                $variable = $settings['question-variable-name'][$index][$qindex] ?? null;
                $type = $settings['question-type'][$index][$qindex] ?? null;

                if (empty($variable) || empty($question) || empty($type))
                    continue;

                $event = $settings['question-branch-event'][$index][$qindex] ?? null;
                $var = $settings['question-branch-variable'][$index][$qindex] ?? null;
                $val = (string)($settings['question-branch-value'][$index][$qindex] ?? '');
                $rawReplace = $settings['question-replace'][$index][$qindex] ?? '';
                $replace = array_filter(array_map('trim', explode(',', $rawReplace)));

                // Check branching logic
                $branchLogicPass = false;
                $branchingLogicEnabled = !empty($event) && !empty($var);

                if ($branchingLogicEnabled) {
                    $target = null;
                    if (!empty($record)) {
                        $targetData = REDCap::getData($project_id, 'array', $record, $var, $event);
                        $target = $targetData[$record][$event][$var] ?? null;
                    }

                    if (substr($val, 0, 1) === "!") {
                        $compVal = substr($val, 1);
                        $branchLogicPass = ($target != $compVal);
                    } else {
                        $branchLogicPass = ($target == $val);
                    }
                }

                $calendars[$field]['questions'][$variable] = [
                    'index' => $qindex,
                    'text' => $question,
                    'type' => $type,
                    'variable' => $variable,
                    'replace' => $replace,
                    'logic' => !$branchingLogicEnabled || $branchLogicPass
                ];
            }

            // Build out ranges based on settings
            $startEvents = $settings['start-event'][$index] ?? [];
            foreach ($startEvents as $qindex => $startEvent) {
                $startVar = $settings['start-variable'][$index][$qindex] ?? null;
                $endEvent = $settings['end-event'][$index][$qindex] ?? null;
                $endVar = $settings['end-variable'][$index][$qindex] ?? null;
                $startoffset = $settings['start-offset'][$index][$qindex] ?? null;
                $endoffset = $settings['end-offset'][$index][$qindex] ?? null;

                if (empty($startVar) || empty($endEvent) || empty($endVar) || empty($startEvent))
                    continue;

                $start = null;
                $end = null;

                if (!empty($record)) {
                    $seData = REDCap::getData($project_id, 'array', $record, [$startVar, $endVar], [$startEvent, $endEvent]);
                    $start = $seData[$record][$startEvent][$startVar] ?? null;
                    $end = $seData[$record][$endEvent][$endVar] ?? null;
                }

                $rawExclude = $settings['range-exclude'][$index][$qindex] ?? '';
                $exclude = array_filter(array_map('trim', explode(',', $rawExclude)));

                if (!empty($startoffset) && !empty($start)) {
                    $startoffset = $startoffset[0] === '-' ? $startoffset : "+$startoffset";
                    $start = date('Y-m-d', strtotime("$start $startoffset days"));
                }
                if (!empty($endoffset) && !empty($end)) {
                    $endoffset = $endoffset[0] === '-' ? $endoffset : "+$endoffset";
                    $end = date('Y-m-d', strtotime("$end $endoffset days"));
                }

                if (!empty($start) && !empty($end) && $end < $start) {
                    $t = $end;
                    $end = $start;
                    $start = $t;
                }

                $calendars[$field]['range'][] = [
                    'start' => $start,
                    'end' => $end,
                    'exclude' => $exclude
                ];
            }

            // Build out mark all buttons
            $buttonTexts = $settings['button-text'][$index] ?? [];
            foreach ($buttonTexts as $qindex => $buttonText) {
                $tooltip = $settings['button-tooltip'][$index][$qindex] ?? null;
                $var = $settings['button-var'][$index][$qindex] ?? null;
                $val = $settings['button-val'][$index][$qindex] ?? null;

                if (!is_null($buttonText) && !is_null($var) && !is_null($val)) {
                    $calendars[$field]['buttons'][] = [
                        'text' => $buttonText,
                        'tooltip' => $tooltip,
                        'variable' => $var,
                        'value' => $val
                    ];
                }
            }
        }

        if (!empty($calendars)) {
            $this->loadSettings([
                "config" => $calendars
            ]);
            $this->includeLibraries();
            $this->includeCSS();
            $this->includeJs('main.js');
        }
    }

    /*
    Init JS module global and populate with settings
    */
    private function loadSettings($data = [], $loadFieldInfo = false)
    {
        $this->initializeJavascriptModuleObject();
        $this->tt_transferToJavascriptModuleObject();
        $data = array_merge($data, [
            "prefix" => $this->getPrefix()
        ]);

        if ($loadFieldInfo) {
            $notes_fields = [];
            $dd = REDCap::getDataDictionary('array');
            foreach ($dd as $field_name => $field_attributes) {
                if ($field_attributes['field_type'] == "notes")
                    $notes_fields[] = $field_name;
            }

            $projectId = $this->getProjectId();
            $used_fields = array_filter($this->getProjectSetting('name', $projectId) ?? []);
            $structured = [];
            if (!empty($used_fields)) {
                $used_notes = array_intersect($used_fields, $notes_fields);
                if (!empty($used_notes)) {
                    if ($projectId) {
                        $params = array_merge([$projectId], $used_notes);
                        $placeholders = implode(',', array_fill(0, count($used_notes), '?'));
                        $dataTable = method_exists('REDCap', 'getDataTable') ? REDCap::getDataTable($projectId) : 'redcap_data';
                        $result = $this->query(
                            "SELECT record, field_name, CHAR_LENGTH(value) AS val_len 
                             FROM $dataTable 
                             WHERE project_id = ? AND field_name IN ($placeholders) AND value IS NOT NULL AND value != ''",
                            $params
                        );
                        while ($row = $result->fetch_assoc()) {
                            $field = $row['field_name'];
                            $rec = $row['record'];
                            $lenRatio = $row['val_len'] / (2 << 15);
                            $current = $structured[$field]["str $rec"] ?? 0;
                            if ($lenRatio > $current) {
                                $structured[$field]["str $rec"] = $lenRatio;
                            }
                        }
                    }
                }
            }

            $data = array_merge($data, [
                "notesFields" => $notes_fields,
                "metrics" => $structured,
            ]);
        }

        $json = json_encode($data, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);
        echo "<script>Object.assign({$this->getJavascriptModuleObjectName()}, {$json});</script>";
    }

    /*
    HTML to include JS libraries
    */
    private function includeLibraries()
    {
        echo "<script src='{$this->getUrl('js/dayjs.min.js')}'></script>";
    }

    /*
    HTML to include a JS file
    */
    private function includeJs($path)
    {
        echo "<script src='{$this->getUrl('js/' .$path)}'></script>";
    }

    /*
    HTML to include stylesheet
    */
    private function includeCSS()
    {
        echo "<link rel='stylesheet' href='{$this->getUrl('style.css')}'>";
    }
}
