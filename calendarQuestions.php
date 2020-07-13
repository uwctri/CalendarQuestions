<?php

namespace UWMadison\calendarQuestions;
use ExternalModules\AbstractExternalModule;
use ExternalModules\ExternalModules;

use REDCap;

class calendarQuestions extends AbstractExternalModule {
    
    private $module_prefix = 'calendarQuestions';
    private $module_global = 'calendarQuestions';
    
    public function __construct() {
            parent::__construct();
    }
    
    public function redcap_every_page_top($project_id) {
        $this->initGlobal();
        // Custom Config page
        if (strpos(PAGE, 'ExternalModules/manager/project.php') !== false && $project_id != NULL) {
            $this->includeJs('config.js');
        }
    }
        
    public function redcap_data_entry_form($project_id, $record, $instrument) {
        global $Proj;
        $calNames = $this->getProjectSetting('name');
        $settings = $this->getProjectSettings();
        foreach ($Proj->metadata as $field_name => $info) {
            $index = array_search($info['element_label'], $calNames);
            if ( $index !== False && $info['element_type'] == 'textarea') {
                $currentValue = REDCap::getData($Proj->project_id,'array',$_GET['id'],$field_name,$_GET['event_id']);
                $currentValue = empty($currentValue) ? "{}" : end(end(end($currentValue)));
                $calendars[$field_name] = [
                    'calendar' => $info['element_label'],
                    'json' => $currentValue,
                    'noFuture' => $settings['nofuture']['value'][$index],
                    'questions' => [],
                    'range' => [],
                    'buttons' => []
                ];
                foreach( $settings['question']['value'][$index] as $qindex => $question ) {
                    $event = $settings['question-branch-event']['value'][$index][$qindex];
                    $var = $settings['question-branch-variable']['value'][$index][$qindex];
                    $val = $settings['question-branch-value']['value'][$index][$qindex];
                    if ( empty($event) || empty($var) || //If Event or Var are missing or if Branching logic checks out add Question
                         $val == end(end(end(REDCap::getData($Proj->project_id,'array',$_GET['id'],$var,$event))))) {
                        array_push($calendars[$field_name]['questions'], [
                            'text' => $question,
                            'type' => $settings['question-type']['value'][$index][$qindex],
                            'variable' => $settings['question-variable-name']['value'][$index][$qindex]
                        ]);
                    }
                }
                foreach( $settings['start-event']['value'][$index] as $qindex => $startEvent ) {
                    $startVar = $settings['start-variable']['value'][$index][$qindex];
                    if ( empty($startVar) )
                        continue;
                    $start = end(end(end(REDCap::getData($Proj->project_id,'array',$_GET['id'],$startVar,$startEvent))));
                    $endEvent = $settings['end-event']['value'][$index][$qindex];
                    $endVar = $settings['end-variable']['value'][$index][$qindex];
                    $endOffset = $settings['end-offset']['value'][$index][$qindex];
                    $endOffset = empty($endOffset) ? '0' : $endOffset;
                    $endOffset = $endOffset[0]=='-' ? $endOffset : "+".$endOffset;
                    if ( $endVar && $endEvent )
                        $end = end(end(end(REDCap::getData($Proj->project_id,'array',$_GET['id'],$endVar,$endEvent))));
                    else
                        $end = date('Y-m-d', strtotime($start . " " . $endOffset . " days"));
                    array_push( $calendars[$field_name]['range'], [
                        'start' => $start,
                        'end' => $end
                    ]);
                }
                foreach( $settings['button-text']['value'][$index] as $qindex => $buttonText ) {
                    $tooltip = $settings['button-tooltip']['value'][$index][$qindex];
                    $var = $settings['button-var']['value'][$index][$qindex];
                    $val = $settings['button-val']['value'][$index][$qindex];
                    if ( !is_null($buttonText) && !is_null($var) && !is_null($val) ) {
                        array_push( $calendars[$field_name]['buttons'], [
                            'text' => $buttonText,
                            'tooltip' => $tooltip,
                            'variable' => $var,
                            'value' => $val
                        ]);
                    }
                }
            }
        }
        if ( !empty($calendars) ) {
            echo "<script src='https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.15/lodash.min.js'></script>";
            echo "<script src='https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.27.0/moment.min.js'></script>";
            echo "<script src='https://cdnjs.cloudflare.com/ajax/libs/moment-range/4.0.2/moment-range.js'></script>";
            echo "<script src='https://cdnjs.cloudflare.com/ajax/libs/clndr/1.5.1/clndr.min.js'></script>";
            $this->passArgument('config',$calendars);
            $this->includeJs('form.js');
        }
    }
    
    private function initGlobal() {
        $data = array(
            "modulePrefix" => $this->module_prefix,
        );
        echo "<script>var ".$this->module_global." = ".json_encode($data).";</script>";
    }

    private function passArgument($name, $value) {
        echo "<script>".$this->module_global.".".$name." = ".json_encode($value).";</script>";
    }
    
    private function includeJs($path) {
        echo '<script src="' . $this->getUrl($path) . '"></script>';
    }
}

?>
