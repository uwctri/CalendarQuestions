<?php

namespace UWMadison\calendarQuestions;
use ExternalModules\AbstractExternalModule;
use ExternalModules\ExternalModules;
use REDCap;

class calendarQuestions extends AbstractExternalModule {
    
    private $module_global = 'calendarQuestions';
    private $lodashJS = 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.15/lodash.min.js';
    private $momentJS = 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.27.0/moment.min.js';
    private $momentRangeJS = 'https://cdnjs.cloudflare.com/ajax/libs/moment-range/4.0.2/moment-range.js';
    private $clndrJS = 'https://cdnjs.cloudflare.com/ajax/libs/clndr/1.5.1/clndr.min.js';
    
    public function redcap_every_page_top($project_id) {
        
        // Custom Config page
        if (strpos(PAGE, 'manager/project.php') !== false && $project_id != NULL) {
            $this->initGlobal();
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
            $currentValue = REDCap::getData($project_id, 'array', $record, $field, $event_id);
            $currentValue = empty($currentValue) ? "{}" : end(end(end($currentValue)));
            $calendars[$field] = [
                'calendar' => $info['element_label'],
                'json' => $currentValue,
                'noFuture' => $settings['nofuture']['value'][$index],
                'questions' => [],
                'range' => [],
                'buttons' => []
            ];
            
            // Grab calendar question settings
            foreach( $settings['question']['value'][$index] as $qindex => $question ) {
                
                $event = $settings['question-branch-event']['value'][$index][$qindex];
                $var = $settings['question-branch-variable']['value'][$index][$qindex];
                $val = $settings['question-branch-value']['value'][$index][$qindex];
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
                    
                    array_push($calendars[$field]['questions'], [
                        'index' => $qindex,
                        'text' => $question,
                        'type' => $settings['question-type']['value'][$index][$qindex],
                        'variable' => $settings['question-variable-name']['value'][$index][$qindex]
                    ]);
                    
                }
                
            }
            
            // Build out ranges based on settings
            foreach( $settings['start-event']['value'][$index] as $qindex => $startEvent ) {
                
                $startVar = $settings['start-variable']['value'][$index][$qindex];
                if ( empty($startVar) )
                    continue;
                    
                $start = end(end(end(REDCap::getData($project_id,'array',$_GET['id'],$startVar,$startEvent))));
                $endEvent = $settings['end-event']['value'][$index][$qindex];
                $endVar = $settings['end-variable']['value'][$index][$qindex];
                $endOffset = $settings['end-offset']['value'][$index][$qindex];
                $endOffset = empty($endOffset) ? '0' : $endOffset;
                $endOffset = $endOffset[0]=='-' ? $endOffset : "+".$endOffset;
                $exclude = array_filter(array_map('trim', explode(',',$settings['range-exclude']['value'][$index][$qindex])));
                
                if ( $endVar && $endEvent )
                    $end = end(end(end(REDCap::getData($project_id,'array',$_GET['id'],$endVar,$endEvent))));
                else
                    $end = date('Y-m-d', strtotime($start . " " . $endOffset . " days"));
                array_push( $calendars[$field]['range'], [
                    'start' => $start,
                    'end' => $end,
                    'exclude' => $exclude
                ]);
                
            }
            
            // Build out any buttons
            foreach( $settings['button-text']['value'][$index] as $qindex => $buttonText ) {
                $tooltip = $settings['button-tooltip']['value'][$index][$qindex];
                $var = $settings['button-var']['value'][$index][$qindex];
                $val = $settings['button-val']['value'][$index][$qindex];
                if ( !is_null($buttonText) && !is_null($var) && !is_null($val) ) {
                    array_push( $calendars[$field]['buttons'], [
                        'text' => $buttonText,
                        'tooltip' => $tooltip,
                        'variable' => $var,
                        'value' => $val
                    ]);
                }
            }
        }
        
        if ( !empty($calendars) ) {
            $this->includeJSclndr();
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
        $data = json_encode([
            "modulePrefix" => $this->PREFIX,
        ]);
        echo "<script>var {$this->module_global} = {$data};</script>";
    }

    private function passArgument($name, $value) {
        echo "<script>{$this->module_global}.{$name} = ".json_encode($value).";</script>";
    }
    
    private function includeJs($path) {
        echo "<script src={$this->getUrl($path)}></script>";
    }
}

?>
