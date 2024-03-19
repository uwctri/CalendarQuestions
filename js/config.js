$(document).ready(function () {

    console.log("Loaded CalendarQuestions config")
    let $modal = $('#external-modules-configure-modal');
    let module = ExternalModules.UWMadison.CalendarQuestions;

    $modal.on('show.bs.modal', function () {

        // Making sure we are overriding this modules's modal only.
        if ($(this).data('module') !== module.prefix)
            return;

        if (typeof ExternalModules.Settings.prototype.resetConfigInstancesOld === 'undefined')
            ExternalModules.Settings.prototype.resetConfigInstancesOld = ExternalModules.Settings.prototype.resetConfigInstances;

        ExternalModules.Settings.prototype.resetConfigInstances = function () {
            ExternalModules.Settings.prototype.resetConfigInstancesOld();

            if ($modal.data('module') !== module.prefix)
                return;

            $modal.addClass('calQConfig');

            // Style the Branching logic
            $modal.find("tr[field=question-branch-value] .external-modules-input-td").not(':contains(=)').prepend('= ');

            // Default Radio Buttons to 1st choice
            $("tr[field=question-type] input:first-child").each(function () {
                if (!$(this).is(":checked") && !$(this).siblings("input:checked").length)
                    $(this).click();
            });

            // Remove all options except for the notes fields
            $("select[name^=name____] option").each((_, el) => {
                let field_name = $(el).val();
                if (field_name != "" && !module.notesFields.includes(field_name)) {
                    $(el).remove();
                }
            })

        };
    });

    $modal.on('hide.bs.modal', function () {
        // Making sure we are overriding this modules's modal only.
        if ($(this).data('module') !== module.prefix)
            return;

        $(this).removeClass('calQConfig');

        if (typeof ExternalModules.Settings.prototype.resetConfigInstancesOld !== 'undefined')
            ExternalModules.Settings.prototype.resetConfigInstances = ExternalModules.Settings.prototype.resetConfigInstancesOld;
    });
});