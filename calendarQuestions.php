<?php

namespace UWMadison\calendarQuestions;

use ExternalModules\AbstractExternalModule;
use REDCap;

class calendarQuestions extends AbstractExternalModule
{

    private $module_global = 'calQ';

    /*
    Redcap Hook, loads config page customizations
    */
    public function redcap_every_page_top($project_id)
    {

        // Custom Config page
        if ($this->isPage('ExternalModules/manager/project.php') && $project_id) {
            $this->initGlobal();
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

        $calNames = $this->getProjectSetting('name');
        $settings = $this->getProjectSettings();
        $fields = REDCap::getFieldNames($instrument);

        // Intersection of targets and all fields on the instrument
        $targets = array_filter($fields, function ($f) use ($calNames) {
            return in_array($f, $calNames);
        });

        // Loop over all calendars we need to create
        foreach ($targets as $field) {

            $index = array_search($field, $calNames);

            // Grab any existing data
            $json = REDCap::getData($project_id, 'array', $record, $field, $event_id);
            $json = empty($json) ? "{}" : end(end(end($json)));
            $calendars[$field] = [
                'json' => $json,
                'noFuture' => $settings['nofuture'][$index],
                'questions' => [],
                'range' => [],
                'buttons' => []
            ];

            // Grab calendar question settings
            foreach ($settings['question'][$index] as $qindex => $question) {

                // Required vars
                $variable = $settings['question-variable-name'][$index][$qindex];
                $type = $settings['question-type'][$index][$qindex];

                if (empty($variable) || empty($question) || empty($type))
                    continue;

                // Grab all other config
                $event = $settings['question-branch-event'][$index][$qindex];
                $var = $settings['question-branch-variable'][$index][$qindex];
                $val = $settings['question-branch-value'][$index][$qindex];
                $replace = $settings['question-replace'][$index][$qindex];

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
                if (empty($startVar) || empty($endEvent) || empty($endVar) || empty($startEvent))
                    continue;

                // Fetch start/end values
                $start = end(end(end(REDCap::getData($project_id, 'array', $record, $startVar, $startEvent))));
                $end = end(end(end(REDCap::getData($project_id, 'array', $record, $endVar, $endEvent))));

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
            $template = array_combine(["td", "btn", "btnLink", "btnGroup", "calendar"], explode("##", $template));
            $this->initGlobal();
            $this->passArgument('template', $template);
            $this->passArgument('config', $calendars);
            $this->includeJSclndr();
            $this->includeCSS();
            $this->includeJs('main.js');
        }
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
    HTML to init our JS module global and populate with the prefix
    */
    private function initGlobal()
    {
        echo "<script>var {$this->module_global} = {'modulePrefix': '{$this->getPrefix()}'};</script>";
    }

    /*
    HTML to pass down additional data to the JS global
    */
    private function passArgument($name, $value)
    {
        echo "<script>{$this->module_global}.{$name} = " . json_encode($value) . ";</script>";
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
