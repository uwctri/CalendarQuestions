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
            let trash,a,b;
            $("select[name^=question-branch-event]").each( function() {
                [trash,a,b] = $(this).prop('name').split('____');
                $(`select[name=question-branch-variable____${a}____${b}]`).insertAfter($(`select[name=question-branch-event____${a}____${b}]`));
                if ( $(`select[name=question-branch-event____${a}____${b}]`).next().first().get(0).outerHTML != "<br>" )
                    $(`select[name=question-branch-event____${a}____${b}]`).after('<br>');
                $(`input[name=question-branch-value____${a}____${b}]`).insertAfter($(`select[name=question-branch-variable____${a}____${b}]`));
                if ( $(`select[name=question-branch-variable____${a}____${b}]`).next().first().get(0).outerHTML != "<br>" )
                    $(`select[name=question-branch-variable____${a}____${b}]`).after('<br>');
            });
            $("select[name^=question-branch-variable], select[name^=question-branch-event], input[name^=question-branch-value]").addClass('mb-2');
            $("tr[field=question-branch-variable], tr[field=question-branch-value]").hide();
            
            // Rearrange Start/End Range
            $("select[name^=start-event]").each( function() {
                [trash,a,b] = $(this).prop('name').split('____');
                $(`select[name=start-variable____${a}____${b}]`).insertAfter($(`select[name=start-event____${a}____${b}]`));
                if ( $(`select[name=start-event____${a}____${b}]`).next().first().get(0).outerHTML != "<br>" )
                    $(`select[name=start-event____${a}____${b}]`).after('<br>');
                $(`select[name=end-variable____${a}____${b}]`).insertAfter($(`select[name=end-event____${a}____${b}]`));
                if ( $(`select[name=end-event____${a}____${b}]`).next().first().get(0).outerHTML != "<br>" )
                    $(`select[name=end-event____${a}____${b}]`).after('<br>');
            });
            $("select[name^=start-event], select[name^=start-variable],select[name^=end-event], select[name^=end-variable]").addClass('mb-2');
            $("tr[field=start-variable], tr[field=end-variable]").hide();
            
            // Default Radio Buttons to 1st choice
            $("input[name^=question-type]").each( function(index) {
                if ( index % 2 != 0 )
                    return;
                if ( !$(this).is(":checked") && !$(this).siblings("input").first().is(":checked") )
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

        $modal.removeClass('defaultFormStatusConfig');
    });
});