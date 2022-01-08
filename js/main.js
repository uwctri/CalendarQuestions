calQ.json = {};
calQ.wrap = '<td class="labelrc col-12" colspan="3"><div class="clndr" id="CALNAME"></div></td>';
calQ.btn = '<button type="button" class="btn btn-dark btn-sm markAllButton" data-toggle="tooltip" title="TOOLTIP">TEXT</button>';

calQ.clearCalendarData = function (calendar) {
    $(`textarea[name=${calendar}]`).val('{}');
}

calQ.loadCalendarJSON = function (calendar, month) {

    const $cal = $(`#${calendar}Calendar`);

    // Loop over data for the month
    $.each(calQ.json[calendar], function (date, vars) {
        $.each(vars, function (varName, value) {

            // Skip days outside the month
            if (varName[0] == "_" || (moment(date).format("MM") != month))
                return;

            $el = $cal.find(`.event-item[data-date=${date}] *[data-variable=${varName}]`);
            const type = calQ.config[calendar].questions[varName].type;

            // Enter data based on the format
            if (["text", "int", "float"].includes(type)) {
                $el.val(value);
            }
            else if (!isEmpty(value) && type == "yesno") {
                $el.find(`[value=${value}]`).attr('checked', true);
            }
            else if (!isEmpty(value) && value == '1' && type == "check") {
                $el.attr('checked', true);
            }
        });

        calQ.colorDayComplete(calendar, vars['_complete'], date);

    });
}

calQ.showDateQuestions = function (calendar, date) {
    const $cal = $(`#${calendar}Calendar`);
    $cal.find(`.event-item`).hide();
    if (!calQ.config[calendar]['noFuture'] || (moment().diff(date, 'days') > 0)) {
        $cal.find(`.event-item[data-date=${date.format('YYYY-MM-DD')}]`).show();
    }
    calQ.updateMarkAllButtons(calendar);
}

calQ.jsonSaveCalendar = function (calendar, date, variable, value) {
    calQ.json[calendar][date][variable] = value;
    calQ.updateDayComplete(calendar, date, variable);
    $(`textarea[name=${calendar}]`).val(JSON.stringify(calQ.json[calendar]));
}

calQ.updateDayComplete = function (calendar, date) {

    const updateColor = !!!date;
    date = date || $(".clndr-grid .today").children().data('date');

    if (!calQ.json[calendar][date])
        return;

    calQ.json[calendar][date]['_complete'] = 1;
    $.each(calQ.json[calendar][date], function (varName, value) {
        if (value !== undefined && varName != "_complete" &&
            calQ.config[calendar].questions[varName].type != 'check' &&
            value.toString() == "") {
            calQ.json[calendar][date]['_complete'] = 0;
            return false;
        }
    });

    if (updateColor) {
        calQ.colorDayComplete(calendar, calQ.json[calendar][date]['_complete'], date);
    }
}

calQ.colorDayComplete = function (calendar, isComplete, date) {
    const $cal = $(`#${calendar}Calendar`);
    $cal.find(`.calendar-day-${date}`).removeClass('day-complete day-incomplete');
    if (calQ.config[calendar]['noFuture'] && (moment().diff(moment(date, 'YYYY-MM-DD'), 'days') <= 0))
        return;
    $cal.find(`.calendar-day-${date}`).addClass(isComplete == 1 ? 'day-complete' : 'day-incomplete');
}

calQ.calMarkAllAsValue = function (calendar, variable, value) {

    const $cal = $(`#${calendar}Calendar`);
    const type = calQ.config[calendar].questions[variable].type;
    const month = $(".clndr-grid .today").children().data('date').split('-')[1];

    $.each(calQ.json[calendar], function (date, data) {
        if (date.split('-')[1] != month || data['_complete'] == 1)
            return;
        calQ.json[calendar][date][variable] = value;
    });

    $(`textarea[name=${calendar}]`).val(JSON.stringify(calQ.json[calendar]));
    calQ.loadCalendarJSON(calendar, month);
}

calQ.insertMarkAllButton = function (calendar, settings) {

    $.each(settings['buttons'], function (_, btn) {

        $(`#${calendar}Calendar`).append(calQ.btn.replace('TEXT', btn.text).replace('TOOLTIP', btn.tooltip));

        let target = `#${calendar}Calendar button`;
        if (btn.tooltip) $(target).last().tooltip();

        $(target).last().on('click', function () {
            calQ.calMarkAllAsValue(calendar, btn.variable, btn.value);
        });

        // Hacky css stuff, don't hate me
        if ($(target).first().css('top')) {
            $(target).last().css('top', $(target).first().css('top').replace('px', '') - (35 * ($(target).length - 1)));
        }
    });

}

calQ.updateMarkAllButtons = function (calendar) {
    const $cal = $(`#${calendar}Calendar`);
    $cal.parent().find("button.markAllButton").show();
    $.each(calQ.config[calendar].buttons, function () {
        if (!$cal.find(`[data-variable=${this.variable}]:visible`).length)
            $(`button.markAllButton:contains(${this.text})`).hide();
    });
}

calQ.setupSaving = function (calendar) {
    const $cal = $(`#${calendar}Calendar`);
    //Setup every save back to JSON
    $cal.find("[class^=event-item-input-]").on('click change', function () {
        let newVal = $(this).prop('type') == "checkbox" ? ($(this).is(':checked') ? '1' : '0') : $(this).val();
        calQ.jsonSaveCalendar(calendar, $(this).parent().data('date'), $(this).data('variable'), newVal);
    });
}

calQ.setupValidation = function (calendar) {
    const $cal = $(`#${calendar}Calendar`);

    //Setup validation
    $cal.find(`.event-item-input-int`).on("keypress keyup blur", function (event) {
        $(this).val($(this).val().replace(/[^\d].+/, ""));
        if ((event.which < 48 || event.which > 57))
            event.preventDefault();
    });
    $cal.find(`.event-item-input-float`).on("keypress keyup blur", function (event) {
        $(this).val($(this).val().replace(/[^0-9\.]/g, ""));
        if ((event.which != 46 || $(this).val().indexOf('.') != -1) && (event.which < 48 || event.which > 57))
            event.preventDefault();
    });
}

calQ.arrowNavigation = function (e) {
    const arrowMap = {
        "ArrowLeft": -1,
        "ArrowUp": -7,
        "ArrowRight": 1,
        "ArrowDown": 7
    };
    if (!Object.keys(arrowMap).includes(event.key)) return;
    const date = moment($(".clndr-grid .today").children().data('date'));
    const newDate = moment(date).add(arrowMap[event.key], 'days');
    const $el = $(`.calendar-day-${newDate.format("YYYY-MM-DD")}`);
    if ($el.length && date.format("MM") == newDate.format("MM")) {
        $el.click();
        e.preventDefault();
    }
};

calQ.arrayIncludesObject = function (array, obj) {
    const json = JSON.stringify(obj);
    array.forEach(a => {
        if (JSON.stringify(a) == json)
            return true;
    });
    return false;
}

$(document).ready(function () {

    // Simple setup
    document.onkeydown = calQ.arrowNavigation;
    window['moment-range'].extendMoment(moment);

    // Loop over all config
    $.each(calQ.config, function (calName, calSettings) {

        // Prep the area for the calendar
        if ($(`[name=${calName}]`).length == 0)
            return;
        $(`#${calName}-tr td`).hide()
        $(`#${calName}-tr`).append(calQ.wrap.replace('CALNAME', `${calName}Calendar`));

        // Load JSON from the text area
        let json = $(`textarea[name=${calName}]`).val();
        json = isEmpty(json) ? {} : JSON.parse(json);

        let events = [];
        let unique = [];

        // Build out the JSON with any new range info we might have
        $.each(calSettings.range, function (_, rangeObj) {

            // Skip if start/end ranges don't exist yet
            if (!rangeObj.start || !rangeObj.end)
                return;

            // Loop over every day in the range
            for (let day of moment.range(rangeObj.start, rangeObj.end).by('days')) {

                const date = day.format('YYYY-MM-DD');

                // Init Json structure
                if (json[date] === undefined) {
                    json[date] = {};
                    json[date]["_complete"] = 0;
                }

                $.each(calSettings.questions, function () {

                    let question = { date: date, name: this.variable };

                    if (calQ.arrayIncludesObject(unique, question) ||
                        (isEmpty(json[date][this.variable]) && rangeObj.exclude.includes(this.variable)))
                        return;

                    unique.push(question);
                    json[date][this.variable] = json[date][this.variable] || "";
                    events.push({
                        index: this.index,
                        date: date,
                        question: this.text,
                        type: this.type,
                        variable: this.variable
                    });
                });
            }
        });

        events.sort((a, b) => (b.index < a.index) ? 1 : -1); // Sort by question index for consistent display
        calQ.json[calName] = json;

        // Init the CLNDR
        let $cal = $(`#${calName}Calendar`);
        $cal.clndr({
            template: calQ.template,
            events: events,
            forceSixRows: true,
            ready: function () {
                calQ.insertMarkAllButton(calName, calSettings);
                calQ.updateMarkAllButtons(calName);
            },
            clickEvents: {
                click: function (target) {
                    calQ.updateDayComplete(calName);
                    $cal.find(".today").removeClass('today');
                    $(target.element).addClass('today');
                    calQ.showDateQuestions(calName, target.date);
                },
                onMonthChange: function (month) {
                    calQ.loadCalendarJSON(calName, month.format("MM"));
                    $(`.calendar-day-${month.format("YYYY-MM-DD")}`).click();
                }
            },
            doneRendering: function () {
                calQ.showDateQuestions(calName, moment());
                calQ.loadCalendarJSON(calName, moment().format("MM"));
                calQ.setupSaving(calName);
                calQ.setupValidation(calName);
            }
        });

    });
});