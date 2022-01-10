calQ.json = {};
calQ.filters = {};
calQ.wrap = '<td class="labelrc col-12" colspan="3"><div class="clndr" id="CALNAME"></div></td>';
calQ.btn = '<button type="button" class="btn btn-dark btn-sm markAllButton" data-toggle="tooltip" title="TOOLTIP">TEXT</button>';

/*

*/
calQ.clearCalendarData = function (calendar) {
    $(`textarea[name=${calendar}]`).val('{}');
}

/*

*/
calQ.loadCalendarJSON = function (calendar, month) {

    const $cal = $(`#${calendar}Calendar`);

    // Loop over data for the month
    $.each(calQ.json[calendar], (date, vars) => {
        $.each(vars, (varName, value) => {

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
};

/*

*/
calQ.showDateQuestions = function (calendar, date) {
    const mDate = moment(date);
    const $cal = $(`#${calendar}Calendar`);
    $cal.find(`.event-item`).hide();
    if (!calQ.config[calendar]['noFuture'] || (moment().diff(mDate, 'days') > 0)) {
        $cal.find(`.event-item[data-date=${mDate.format('YYYY-MM-DD')}]`).show();
    }
    calQ.applyReplaceFilter(calendar, date);
    calQ.updateMarkAllButtons(calendar);
};

/*

*/
calQ.jsonSaveCalendar = function (calendar, date, variable, value) {
    calQ.json[calendar][date][variable] = value;
    calQ.updateDayComplete(calendar, date, variable);
    $(`textarea[name=${calendar}]`).val(JSON.stringify(calQ.json[calendar]));
};

/*

*/
calQ.updateDayComplete = function (calendar, date) {

    const updateColor = !!!date;
    date = date || $(".clndr-grid .today").children().data('date');

    if (!calQ.json[calendar][date])
        return;

    calQ.json[calendar][date]['_complete'] = 1;
    $.each(calQ.json[calendar][date], (varName, value) => {
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
};

/*

*/
calQ.colorDayComplete = function (calendar, isComplete, date) {
    const $cal = $(`#${calendar}Calendar`);
    $cal.find(`.calendar-day-${date}`).removeClass('day-complete day-incomplete');
    if (calQ.config[calendar]['noFuture'] && (moment().diff(moment(date, 'YYYY-MM-DD'), 'days') <= 0))
        return;
    $cal.find(`.calendar-day-${date}`).addClass(isComplete == 1 ? 'day-complete' : 'day-incomplete');
}

/*

*/
calQ.calMarkAllAsValue = function (calendar, variable, value) {

    const $cal = $(`#${calendar}Calendar`);
    const type = calQ.config[calendar].questions[variable].type;
    const month = $(".clndr-grid .today").children().data('date').split('-')[1];

    $.each(calQ.json[calendar], (date, data) => {
        if (date.split('-')[1] != month || data['_complete'] == 1)
            return;
        calQ.json[calendar][date][variable] = value;
    });

    $(`textarea[name=${calendar}]`).val(JSON.stringify(calQ.json[calendar]));
    calQ.loadCalendarJSON(calendar, month);
};

/*

*/
calQ.insertMarkAllButton = function (calendar, settings) {

    $.each(settings['buttons'], (_, btn) => {

        $(`#${calendar}Calendar`).append(calQ.btn.replace('TEXT', btn.text).replace('TOOLTIP', btn.tooltip));

        const $target = $(`#${calendar}Calendar button`);
        if (btn.tooltip) $target.last().tooltip();

        $target.last().on('click', () => calQ.calMarkAllAsValue(calendar, btn.variable, btn.value));

        // Hacky css stuff, don't hate me
        if ($target.first().css('top')) {
            $target.last().css('top', $target.first().css('top').replace('px', '') - (35 * ($target.length - 1)));
        }
    });
};

/*

*/
calQ.updateMarkAllButtons = function (calendar) {
    const $cal = $(`#${calendar}Calendar`);
    $cal.parent().find("button.markAllButton").show();
    $.each(calQ.config[calendar].buttons, (_, btn) => {
        if (!$cal.find(`[data-variable=${btn.variable}]:visible`).length)
            $(`button.markAllButton:contains(${btn.text})`).hide();
    });
};

/*

*/
calQ.setupSaving = function (calendar) {
    const $cal = $(`#${calendar}Calendar`);
    //Setup every save back to JSON
    $cal.find("[class^=event-item-input-]").on('click change', (event) => {
        const $target = $(event.currentTarget);
        const newVal = $target.prop('type') == "checkbox" ? ($target.is(':checked') ? '1' : '0') : $target.val();
        calQ.jsonSaveCalendar(calendar, $target.parent().data('date'), $target.data('variable'), newVal);
    });
};

/*

*/
calQ.setupValidation = function (calendar) {
    const $cal = $(`#${calendar}Calendar`);

    // Only int and float have any validation on them
    $cal.find(`.event-item-input-int`).on("keypress keyup blur", (event) => {
        const $target = $(event.currentTarget);
        $target.val($target.val().replace(/[^\d].+/, ""));
        if ((event.which < 48 || event.which > 57))
            event.preventDefault();
    });
    $cal.find(`.event-item-input-float`).on("keypress keyup blur", (event) => {
        const $target = $(event.currentTarget);
        $target.val($target.val().replace(/[^0-9\.]/g, ""));
        if ((event.which != 46 || $target.val().indexOf('.') != -1) && (event.which < 48 || event.which > 57))
            event.preventDefault();
    });
};

/*

*/
calQ.arrowNavigation = function (event) {
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
    if ($el.length) {
        $el.click();
        event.preventDefault();
    }
};

/*

*/
calQ.applyReplaceFilter = function (calendar, date) {
    const filter = calQ.filters[calendar];
    if (!filter[date] || !filter[date].length)
        return;
    const $cal = $(`#${calendar}Calendar`);
    filter[date].forEach(varName => {
        $cal.find(`[data-variable=${varName}]`).parent().hide();
    });
}

/*

*/
calQ.setDate = function (calendar, date) {
    calQ.updateDayComplete(calendar);
    $(".today").removeClass('today');
    $(`.calendar-day-${date}`).addClass('today');
    calQ.showDateQuestions(calendar, date);
}

$(document).ready(() => {

    // Simple setup
    document.onkeydown = calQ.arrowNavigation;
    window['moment-range'].extendMoment(moment);

    // Loop over all config
    $.each(calQ.config, (calName, calSettings) => {

        // Prep the area for the calendar
        if ($(`[name=${calName}]`).length == 0)
            return;
        $(`#${calName}-tr td`).hide()
        $(`#${calName}-tr`).append(calQ.wrap.replace('CALNAME', `${calName}Calendar`));

        // Load JSON from the text area
        let json = $(`textarea[name=${calName}]`).val();
        json = isEmpty(json) ? {} : JSON.parse(json);

        let events = [];
        let unique = {};
        calQ.filters[calName] = {};

        // Build out the JSON with any new range info we might have
        $.each(calSettings.range, (_, rangeObj) => {

            // Skip if start/end ranges don't exist yet
            if (!rangeObj.start || !rangeObj.end)
                return;

            // Loop over every day in the range
            for (let day of moment.range(rangeObj.start, rangeObj.end).by('days')) {

                const date = day.format('YYYY-MM-DD');
                calQ.filters[calName][date] = calQ.filters[calName][date] || [];
                unique[date] = unique[date] || [];

                // Init Json structure
                if (json[date] === undefined) {
                    json[date] = {};
                    json[date]["_complete"] = 0;
                }

                // Flip through all the questions for today
                $.each(calSettings.questions, (variable, question) => {

                    if (unique[date].includes(variable) ||
                        (isEmpty(json[date][variable]) && rangeObj.exclude.includes(variable)))
                        return;

                    if (question.replace)
                        calQ.filters[calName][date].push(question.replace);

                    unique[date].push(variable);
                    json[date][variable] = json[date][variable] || "";
                    events.push({
                        index: question.index,
                        date: date,
                        question: question.text,
                        type: question.type,
                        variable: variable
                    });
                });
            }
        });

        // Sort by question index for consistent display
        events.sort((a, b) => (b.index < a.index) ? 1 : -1);
        calQ.json[calName] = json;

        // Init the CLNDR
        let $cal = $(`#${calName}Calendar`);
        $cal.clndr({
            template: calQ.template,
            events: events,
            forceSixRows: true,

            // Runs ONCE when the calendar is rendered
            ready: () => {
                calQ.insertMarkAllButton(calName, calSettings);
                calQ.updateMarkAllButtons(calName);
            },

            clickEvents: {

                // Runs when a new date is clicked (or arrowed to)
                click: (target) => {
                    const date = moment($(".clndr-grid .today").children().data('date'));
                    if (target.date.format("MM") == date.format("MM")) {
                        calQ.setDate(calName, target.date.format("YYYY-MM-DD"));
                    }

                },

                // Runs on every month change
                onMonthChange: (firstOfMonth) => {
                    calQ.setDate(calName, firstOfMonth.format("YYYY-MM-DD"));
                }
            },

            // Runs on every month change AND after inital load
            doneRendering: () => {
                calQ.showDateQuestions(calName, moment().format("YYYY-MM-DD"));
                calQ.loadCalendarJSON(calName, moment().format("MM"));
                calQ.setupSaving(calName);
                calQ.setupValidation(calName);
            }
        });
    });
});