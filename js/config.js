$(document).ready(function () {

    console.log("Loaded CalendarQuestions config")
    let $modal = $('#external-modules-configure-modal');
    let module = ExternalModules.UWMadison.CalendarQuestions;

    Object.keys(module.metrics).forEach(field => {
        module.metrics[field] = Object.entries(module.metrics[field])
            .sort(([, a], [, b]) => b - a)
            .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
    });

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
                if (field_name != "" && !module.notesFields.includes(field_name))
                    $(el).remove();
            });

            // // Add metrics to the target field row
            $("tr[field=name").each((_, el) => {
                if ($(el).find(".table-em-stats").length)
                    return;

                let field_name = $(el).find("select").val();
                let metrics = module.metrics[field_name] ?? {};
                metrics = Object.entries(metrics).slice(0, 5);
                if (metrics.length == 0)
                    return;

                // Create a simple html table with the metrics
                let table = $("<table>").addClass("table table-sm table-borderless table-em-stats");
                metrics.forEach(([record, perc]) => {
                    record = record.replace("str ", "");
                    perc = (perc * 100).toFixed(2) + "%";
                    let row = $("<tr>").append($("<td>").text(record)).append($("<td>").text(perc));
                    table.append(row);
                });

                // Append the table in a row after the current
                $(el).find("div").after(table).after("<br><div>The below records contain the most data for the selected field</div>");

            });

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