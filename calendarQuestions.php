<?php

namespace UWMadison\calendarQuestions;
use ExternalModules\AbstractExternalModule;
use REDCap;

class calendarQuestions extends AbstractExternalModule {
    
    private $module_global = 'calQuestions';
    private $lodashJS = 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.15/lodash.min.js';
    private $momentJS = 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.27.0/moment.min.js';
    private $momentRangeJS = 'https://cdnjs.cloudflare.com/ajax/libs/moment-range/4.0.2/moment-range.js';
    private $clndrJS = 'https://cdnjs.cloudflare.com/ajax/libs/clndr/1.5.1/clndr.min.js';
    
    public function redcap_every_page_top($project_id) {
        
        // Custom Config page
        if ($this->isPage('ExternalModules/manager/project.php') && $project_id) {
            $this->initGlobal();
            $this->includeCSS();
            $this->includeJs('config.js');
        }
        
    }
    
    public function redcap_data_entry_form($project_id, $record, $instrument, $event_id) {
        
        global $Proj;
        $calNames = $this->getProjectSetting('name');
        $settings = $this->getProjectSettings();
        $fields = REDCap::getFieldNames($instrument);
        
        // Loop over fields on the intrument
        foreach ($fields as $field) {
            
            // Check to see if the field is one we modify, if not exit
            $info = $Proj->metadata[$field];
            $index = array_search($info['element_label'], $calNames);
            if ( $index === False || $info['element_type'] != 'textarea') 
                continue;
            
            // Grab any existing data
            $json = REDCap::getData($project_id, 'array', $record, $field, $event_id);
            $json = empty($json) ? "{}" : end(end(end($json)));
            $calendars[$field] = [
                'calendar' => $info['element_label'],
                'json' => $json,
                'noFuture' => $settings['nofuture'][$index],
                'questions' => [],
                'range' => [],
                'buttons' => []
            ];
            
            // Grab calendar question settings
            foreach( $settings['question'][$index] as $qindex => $question ) {
                
                $event = $settings['question-branch-event'][$index][$qindex];
                $var = $settings['question-branch-variable'][$index][$qindex];
                $val = $settings['question-branch-value'][$index][$qindex];
                $branchLogicPass = false;
                
                if ( !empty($event) && !empty($var) ) {
                    $target = REDCap::getData($project_id,'array',$record,$var,$event)[$record][$event][$var];
                    if ( substr($val,0,1) == "!" ) {
                        $val = substr($val,1);
                        $branchLogicPass = $target != $val;
                    } else {
                        $branchLogicPass = $target == $val;
                    }
                }
                
                if ( empty($event) || empty($var) || $branchLogicPass) {
                    $calendars[$field]['questions'][] = [
                        'index' => $qindex,
                        'text' => $question,
                        'type' => $settings['question-type'][$index][$qindex],
                        'variable' => $settings['question-variable-name'][$index][$qindex]
                    ];
                }
                
            }
            
            // Build out ranges based on settings
            foreach( $settings['start-event'][$index] as $qindex => $startEvent ) {
                
                $startVar = $settings['start-variable'][$index][$qindex];
                $endEvent = $settings['end-event'][$index][$qindex];
                $endVar = $settings['end-variable'][$index][$qindex];
                if ( empty($startVar) || empty($endEvent) || empty($endVar) )
                    continue;
                    
                $start = end(end(end(REDCap::getData($project_id,'array',$record,$startVar,$startEvent))));
                $exclude = array_filter(array_map('trim', explode(',',$settings['range-exclude'][$index][$qindex])));
                $end = end(end(end(REDCap::getData($project_id,'array',$record,$endVar,$endEvent))));
                
                $startoffset = $settings['start-offset'][$index][$qindex];
                $endoffset = $settings['end-offset'][$index][$qindex];
                if ( !empty($startoffset) ) {
                    $startoffset = $startoffset[0]=='-' ? $startoffset : "+$startoffset";
                    $start = date('Y-m-d', strtotime("$start $startoffset days"));
                }
                if ( !empty($endoffset) ) {
                    $endoffset = $endoffset[0]=='-' ? $endoffset : "+$endoffset";
                    $end = date('Y-m-d', strtotime("$end $endoffset days"));
                }
                
                if ( $end < $start ) {
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
            foreach( $settings['button-text'][$index] as $qindex => $buttonText ) {
                $tooltip = $settings['button-tooltip'][$index][$qindex];
                $var = $settings['button-var'][$index][$qindex];
                $val = $settings['button-val'][$index][$qindex];
                if ( !is_null($buttonText) && !is_null($var) && !is_null($val) ) {
                    $calendars[$field]['buttons'][] = [
                        'text' => $buttonText,
                        'tooltip' => $tooltip,
                        'variable' => $var,
                        'value' => $val
                    ];
                }
            }
        }
        
        if ( !empty($calendars) ) {
            $this->includeJSclndr();
            $this->includeCSS();
            $this->initGlobal();
            $this->passArgument('config',$calendars);
            $this->includeJs('form.js');
        }
    }
    
    private function includeJSclndr() {
        echo "<script src={$this->lodashJS}></script>";
        echo "<script src={$this->momentJS}></script>";
        echo "<script src={$this->momentRangeJS}></script>";
        echo "<script src={$this->clndrJS}></script>";
    }
    
    private function initGlobal() {
        echo "<script>var {$this->module_global} = {'modulePrefix': '{$this->getPrefix()}'};</script>";
    }

    private function passArgument($name, $value) {
        echo "<script>{$this->module_global}.{$name} = ".json_encode($value).";</script>";
    }
    
    private function includeJs($path) {
        echo "<script src={$this->getUrl($path)}></script>";
    }
    
    private function includeCSS() {
        echo "<link rel='stylesheet' href={$this->getUrl("style.css")}>";
    }
}

?>
