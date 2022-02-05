calQ.json = {};
calQ.filters = {};
calQ.wrap = '<td class="labelrc col-12" colspan="3"><div class="clndr" id="CALNAME"></div></td>';
calQ.btn = '<button type="button" class="btn btn-dark btn-sm markAllButton" data-toggle="tooltip" title="TOOLTIP">TEXT</button>';

/*
Parse and load onto the screen data for a specific calendar and month
*/
calQ.loadCalendarJSON = function (calendar, month) {

    const $cal = $(`#${calendar}Calendar`);

    // Loop over data for the month
    $.each(calQ.json[calendar], (date, vars) => {
        $.each(vars, (varName, value) => {

            // Skip days outside the month
            if (varName[0] == "_" || (moment(date).format("MM") != month))
                return;

            let search = `.event-item[data-date=${date}] *[data-variable=${varName}]`;
            const type = calQ.config[calendar].questions[varName].type;

            // Enter data based on the format
            if (["text", "int", "float"].includes(type)) {
                $cal.find(search).val(value);
            }
            else if (!isEmpty(value) && type == "yesno") {
                $cal.find(search + `[value=${value}]`).attr('checked', true);
            }
            else if (!isEmpty(value) && value == '1' && type == "check") {
                $cal.find(search).attr('checked', true);
            }
        });

        calQ.colorDayComplete(calendar, date, vars['_complete']);

    });
};

/*
Show the daily questions for a calendar on a date
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
Save a new value for a varaible on a date, in a speicifc calendar 
*/
calQ.jsonSaveCalendar = function (calendar, date, variable, value) {
    calQ.json[calendar][date][variable] = value;
    calQ.updateDayComplete(calendar, date, variable);
    $(`textarea[name=${calendar}]`).val(JSON.stringify(calQ.json[calendar]));
};

/*
Review a specific date on a calendar to determine if all needed
data has been collected or not. If no date is specified then the
currently highlighted date is used and the day is recolored to
red or green.
*/
calQ.updateDayComplete = function (calendar, date) {

    const updateColor = !!!date;
    date = date || $(`#${calendar}Calendar .clndr-grid .today`).children().data('date');

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
        calQ.colorDayComplete(calendar, date, calQ.json[calendar][date]['_complete']);
    }

    $(`textarea[name=${calendar}]`).val(JSON.stringify(calQ.json[calendar]));
};

/*
Update the color of the day on the calendar's display for a given day
*/
calQ.colorDayComplete = function (calendar, date, isComplete) {
    const $cal = $(`#${calendar}Calendar`);
    $cal.find(`.calendar-day-${date}`).removeClass('day-complete day-incomplete');
    if (calQ.config[calendar]['noFuture'] && (moment().diff(moment(date, 'YYYY-MM-DD'), 'days') <= 0))
        return;
    $cal.find(`.calendar-day-${date}`).addClass(isComplete == 1 ? 'day-complete' : 'day-incomplete');
}

/*
Event listener for the Mark all Button. Marks all variables in calendar as value
*/
calQ.calMarkAllAsValue = function (calendar, variable, value) {

    const month = $(`#${calendar}Calendar .clndr-grid .today`).children().data('date').split('-')[1];

    $.each(calQ.json[calendar], (date, data) => {
        if (date.split('-')[1] != month || data['_complete'] == 1)
            return;
        calQ.json[calendar][date][variable] = value;
    });

    $(`textarea[name=${calendar}]`).val(JSON.stringify(calQ.json[calendar]));
    calQ.loadCalendarJSON(calendar, month);
};

/*
One time insert of mark all buttons
*/
calQ.insertMarkAllButton = function (calendar, settings) {

    $.each(settings['buttons'], (_, btn) => {

        // Prep the template
        $(`#${calendar}Calendar`).append(calQ.btn.replace('TEXT', btn.text).replace('TOOLTIP', btn.tooltip));

        // Find the target and enable tooltip
        const $target = $(`#${calendar}Calendar button`);
        if (btn.tooltip) $target.last().tooltip();

        // Setup event listener
        $target.last().on('click', () => calQ.calMarkAllAsValue(calendar, btn.variable, btn.value));
    });
};

/*
Update which mark-all buttons are shown based on what is currently displayed.
*/
calQ.updateMarkAllButtons = function (calendar) {

    // Setup and show all buttons
    const $cal = $(`#${calendar}Calendar`);
    $cal.parent().find("button.markAllButton").show();
    let btnCount = 0;

    $.each(calQ.config[calendar].buttons, (_, btn) => {

        let $target = $cal.find(`button.markAllButton:contains(${btn.text})`);

        // Hide buttons that aren't needed
        if (!$cal.find(`[data-variable=${btn.variable}]:visible`).length) {
            $target.hide();
        } else {
            // Hacky css stuff, don't hate me
            $target.css('transform', `translateY(${-35 * btnCount}px)`);
            btnCount += 1;
        }
    });
};

/*
Setup saving on input change for a calendar
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
Setup validation for a calendar, prevent junk data
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
Event listener for arrow nav on the calendar
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
        $(".clndr:visible").find('input:visible, textarea:visible').first().focus();
    }
};

/*
Apply filters for replace questions logic on a calendar for specific date
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
Update the calendar to a new date
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
        if ($(`[name=${calName}]:visible`).length == 0)
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
                calQ.showDateQuestions(calName, moment().format("YYYY-MM-DD"));
                calQ.loadCalendarJSON(calName, moment().format("MM"));
                calQ.setupSaving(calName);
                calQ.setupValidation(calName);
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
                    calQ.showDateQuestions(calName, firstOfMonth.format("YYYY-MM-DD"));
                    calQ.loadCalendarJSON(calName, firstOfMonth.format("MM"));
                    calQ.setupSaving(calName);
                    calQ.setupValidation(calName);
                }
            }
        });
    });
});