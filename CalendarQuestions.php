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
        // Custom Config page
        if ($this->isPage('ExternalModules/manager/project.php') && $project_id) {
            $this->loadSettings([], true);
            $this->includeCSS();
            $this->includeJs('config.js');
        }
    }

    /*
    Primary Redcap Hook, check if the form has a field from our config on it
    and if so gather all configuration and pass down to JS
    */
    public function redcap_data_entry_form($project_id, $record, $instrument, $event_id)
    {

        $calNames = $this->getProjectSetting('name') ?? [];
        $settings = $this->getProjectSettings();
        $fields = REDCap::getFieldNames($instrument);

        // Intersection of targets and all fields on the instrument
        $targets = array_filter($fields, function ($f) use ($calNames) {
            return in_array($f, $calNames);
        });

        // Loop over all calendars we need to create
        foreach ($targets as $field) {

            $index = array_search($field, $calNames);
            $calendars[$field] = [
                'json' => "{}",
                'noFuture' => $settings['nofuture'][$index],
                'stats' => $settings['stats'][$index],
                'compress' => $settings['compress'][$index],
                'questions' => [],
                'range' => [],
                'buttons' => []
            ];

            // Grab calendar question settings
            foreach ($settings['question'][$index] as $qindex => $question) {

                // Required vars
                $variable = $settings['question-variable-name'][$index][$qindex];
                $type = $settings['question-type'][$index][$qindex];

                if (empty($variable) || empty($question) || empty($type)) {
                    continue;
                }

                // Grab all other config
                $event = $settings['question-branch-event'][$index][$qindex];
                $var = $settings['question-branch-variable'][$index][$qindex];
                $val = $settings['question-branch-value'][$index][$qindex];
                $replace = array_filter(array_map('trim', explode(',', $settings['question-replace'][$index][$qindex])));

                // Check branching logic
                $branchLogicPass = false;
                $branchingLogicEnabled = !empty($event) && !empty($var);

                if ($branchingLogicEnabled) {
                    $target = REDCap::getData($project_id, 'array', $record, $var, $event)[$record][$event][$var];
                    if (substr($val, 0, 1) == "!") {
                        $val = substr($val, 1);
                        $branchLogicPass = $target != $val;
                    } else {
                        $branchLogicPass = $target == $val;
                    }
                }

                // Save settings 
                if (!$branchingLogicEnabled || $branchLogicPass) {
                    $calendars[$field]['questions'][$variable] = [
                        'index' => $qindex,
                        'text' => $question,
                        'type' => $type,
                        'variable' => $variable,
                        'replace' => $replace
                    ];
                }
            }

            // Build out ranges based on settings
            foreach ($settings['start-event'][$index] as $qindex => $startEvent) {

                // Grab all the config
                $startVar = $settings['start-variable'][$index][$qindex];
                $endEvent = $settings['end-event'][$index][$qindex];
                $endVar = $settings['end-variable'][$index][$qindex];
                $startoffset = $settings['start-offset'][$index][$qindex];
                $endoffset = $settings['end-offset'][$index][$qindex];

                // Exit if we are missing any mandatory config
                if (empty($startVar) || empty($endEvent) || empty($endVar) || empty($startEvent)) {
                    continue;
                }

                // Fetch start/end values
                $seData = REDCap::getData($project_id, 'array', $record, [$startVar, $endVar], [$startEvent, $endEvent]);
                $start = $seData[$record][$startEvent][$startVar];
                $end = $seData[$record][$endEvent][$endVar];

                // Explode any excluded values
                $exclude = array_filter(array_map('trim', explode(',', $settings['range-exclude'][$index][$qindex])));

                // If using offsets then add those days to the date we got
                if (!empty($startoffset) && !empty($start)) {
                    $startoffset = $startoffset[0] == '-' ? $startoffset : "+$startoffset";
                    $start = date('Y-m-d', strtotime("$start $startoffset days"));
                }
                if (!empty($endoffset) && !empty($end)) {
                    $endoffset = $endoffset[0] == '-' ? $endoffset : "+$endoffset";
                    $end = date('Y-m-d', strtotime("$end $endoffset days"));
                }

                // Flip values if needed
                if ($end < $start) {
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

            // Build out any buttons
            foreach ($settings['button-text'][$index] as $qindex => $buttonText) {

                $tooltip = $settings['button-tooltip'][$index][$qindex];
                $var = $settings['button-var'][$index][$qindex];
                $val = $settings['button-val'][$index][$qindex];

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
            $template = file_get_contents(dirname(__FILE__) . DIRECTORY_SEPARATOR . 'template.html');
            $template = array_combine(["td", "btn", "btnLink", "btnGroup", "calendar", "stats"], explode("##", $template));
            $this->loadSettings([
                "template" => $template,
                "config" => $calendars
            ]);
            $this->includeJSclndr();
            $this->includeCSS();
            $this->includeJs('main.js');
        }
    }

    /*
    Init our JS module global and populate with the prefix
    */
    private function loadSettings($data = [], $loadFieldInfo = false)
    {
        // Setup Redcap JS object
        $this->initializeJavascriptModuleObject();
        $this->tt_transferToJavascriptModuleObject();
        $data = array_merge($data, [
            "prefix" => $this->getPrefix()
        ]);

        if ($loadFieldInfo) {
            // Grab valid notes fields
            $notes_fields = [];
            $dd = REDCap::getDataDictionary('array');
            foreach ($dd as $field_name => $field_attributes) {
                if ($field_attributes['field_type'] == "notes") {
                    $notes_fields[] = $field_name;
                }
            }

            // Grab existing data for metrics on notes fields
            $used_fields = array_filter($this->getProjectSetting('name') ?? []);
            $structured = [];
            if (!empty($used_fields)) {
                $used_notes = array_intersect($used_fields, $notes_fields);
                $rcdata = REDCap::getData('array', NULL, $used_notes);
                foreach ($rcdata as $record => $events) {
                    foreach ($events as $event => $fields) {
                        foreach ($fields as $field => $value) {
                            $a = $structured[$field]["str $record"] ?? 0;
                            $b = strlen($value) / (2 << 15);
                            $structured[$field]["str $record"] = $a > $b ? $a : $b;
                        }
                    }
                }
            }

            // Merge data
            $data = array_merge($data, [
                "notesFields" => $notes_fields,
                "metrics" => $structured,
            ]);
        }

        // Pass down to JS
        $data = json_encode($data);
        echo "<script>Object.assign({$this->getJavascriptModuleObjectName()}, {$data});</script>";
    }

    /*
    HTML to include all js libraries for the calendar
    */
    private function includeJSclndr()
    {
        echo "<script src={$this->getUrl('js/lodash.min.js')}></script>";
        echo "<script src={$this->getUrl('js/moment.min.js')}></script>";
        echo "<script src={$this->getUrl('js/moment-range.min.js')}></script>";
        echo "<script src={$this->getUrl('js/clndr.min.js')}></script>";
    }

    /*
    HTML to include a JS file
    */
    private function includeJs($path)
    {
        echo "<script src={$this->getUrl('js/' .$path)}></script>";
    }

    /*
    HTML to include the style sheet
    */
    private function includeCSS()
    {
        echo "<link rel='stylesheet' href={$this->getUrl("style.css")}>";
    }
}
