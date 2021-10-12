$(document).ready(function() {
    console.log("Loaded calendarQuestions config")
    var pid = (new URLSearchParams(window.location.search)).get('pid');
    var url = window.location.href.split('/').slice(0,5).join('/');
    var $modal = $('#external-modules-configure-modal');
    $modal.on('show.bs.modal', function() {
        // Making sure we are overriding this modules's modal only.
        if ($(this).data('module') !== calendarQuestions.modulePrefix)
            return;
    
        if (typeof ExternalModules.Settings.prototype.resetConfigInstancesOld === 'undefined')
            ExternalModules.Settings.prototype.resetConfigInstancesOld = ExternalModules.Settings.prototype.resetConfigInstances;

        ExternalModules.Settings.prototype.resetConfigInstances = function() {
            ExternalModules.Settings.prototype.resetConfigInstancesOld();

            if ($modal.data('module') !== calendarQuestions.modulePrefix)
                return;
            
            $modal.find('thead').remove();
            $(".external-modules-instance-label").remove()
            
            // Rearrange Question Branching Logic
            $("tr[field=question-branch-variable] label, tr[field=question-branch-value] label").hide();
            $("tr[field=question-branch-variable] td, tr[field=question-branch-value] td").css('border','none').css('padding-top','.15rem');
            $("tr[field=question-branch-variable] td").css('padding-bottom','.15rem');
            $("tr[field=question-branch-event] td").css('padding-bottom','0');
            $("tr[field=question-branch-value] .external-modules-input-td").prepend('= ');
            $("tr[field=question-branch-value] .external-modules-input-td input").css('width','96%');
            
            // Rearrange Start/End Range
            $("tr[field=start-variable] label, tr[field=end-variable] label").hide();
            $("tr[field=start-event] td, tr[field=end-event] td").css('border-bottom','none').css('padding-bottom','.15rem');
            $("tr[field=start-variable] td, tr[field=end-variable] td").css('border-top','none').css('padding-top','.15rem');
            
            // Default Radio Buttons to 1st choice
            let optionNumber = $("tr[field=question-type]").first().find('input').length;
            $("input[name^=question-type]").each( function(index) {
                if ( index % optionNumber != 0 )
                    return;
                if ( !$(this).is(":checked") && !$(this).siblings("input:checked") )
                     $(this).click();
            });
            
        };
    });
    
    $modal.on('hide.bs.modal', function() {
        // Making sure we are overriding this modules's modal only.
        if ($(this).data('module') !== calendarQuestions.modulePrefix)
            return;

        if (typeof ExternalModules.Settings.prototype.resetConfigInstancesOld !== 'undefined')
            ExternalModules.Settings.prototype.resetConfigInstances = ExternalModules.Settings.prototype.resetConfigInstancesOld;
    });
});