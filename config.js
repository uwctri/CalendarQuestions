$(document).ready(function() {
    console.log("Loaded calendarQuestions config")
    var $modal = $('#external-modules-configure-modal');
    $modal.on('show.bs.modal', function() {
        // Making sure we are overriding this modules's modal only.
        if ($(this).data('module') !== calQuestions.modulePrefix)
            return;
        
        if (typeof ExternalModules.Settings.prototype.resetConfigInstancesOld === 'undefined')
            ExternalModules.Settings.prototype.resetConfigInstancesOld = ExternalModules.Settings.prototype.resetConfigInstances;
        
        ExternalModules.Settings.prototype.resetConfigInstances = function() {
            ExternalModules.Settings.prototype.resetConfigInstancesOld();
            
            if ($modal.data('module') !== calQuestions.modulePrefix)
                return;
            
            $modal.addClass('calQuestionsConfig');
            
            // Style the Branching logic
            $modal.find("tr[field=question-branch-value] .external-modules-input-td").not(':contains(=)').prepend('= ');
            
            // Default Radio Buttons to 1st choice
            $("tr[field=question-type] input:first-child").each( function() {
                if ( !$(this).is(":checked") && !$(this).siblings("input:checked").length )
                    $(this).click();
            });

        };
    });
    
    $modal.on('hide.bs.modal', function() {
        // Making sure we are overriding this modules's modal only.
        if ($(this).data('module') !== calQuestions.modulePrefix)
            return;
        
        $(this).removeClass('calQuestionsConfig');
        
        if (typeof ExternalModules.Settings.prototype.resetConfigInstancesOld !== 'undefined')
            ExternalModules.Settings.prototype.resetConfigInstances = ExternalModules.Settings.prototype.resetConfigInstancesOld;
    });
});