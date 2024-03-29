$(document).ready(() => {

    let json = {};
    let filters = {};
    let module = ExternalModules.UWMadison.CalendarQuestions;

    /*
    Parse and load onto the screen data for a specific calendar and month
    */
    const loadCalendarJSON = (calendar, month) => {

        const $cal = $(`#${calendar}Calendar`);

        // Loop over data for the month
        $.each(json[calendar], (date, vars) => {
            $.each(vars, (varName, value) => {

                // Skip days outside the month
                if (varName[0] == "_" || (moment(date).format("MM") != month)) return;

                let search = `.event-item[data-date=${date}] *[data-variable=${varName}]`;
                if (typeof module.config[calendar].questions[varName] === "undefined") return;
                const type = module.config[calendar].questions[varName].type;

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

            colorDayComplete(calendar, date, vars['_complete']);

        });
    };

    /*
    Show the daily questions for a calendar on a date
    */
    const showDateQuestions = (calendar, date) => {
        const mDate = moment(date);
        const $cal = $(`#${calendar}Calendar`);
        $cal.find(`.event-item`).hide();
        if (!module.config[calendar]['noFuture'] || (moment().diff(mDate, 'days') > 0)) {
            $cal.find(`.event-item[data-date=${mDate.format('YYYY-MM-DD')}]`).show();
        }
        applyReplaceFilter(calendar, date);
        updateMarkAllButtons(calendar);
    };

    /*
    Save a new value for a varaible on a date, in a speicifc calendar 
    */
    const jsonSaveCalendar = (calendar, date, variable, value) => {
        json[calendar][date][variable] = value;
        updateDayComplete(calendar, false, date);
        $(`textarea[name=${calendar}]`).val(JSON.stringify(json[calendar]));
    };

    /*
    Review a specific date on a calendar to determine if all needed
    data has been collected or not. If no date is specified then the
    currently highlighted date is used and the day is recolored to
    red or green.
    */
    const updateDayComplete = (calendar, updateColor, date) => {

        let $today = $(`#${calendar}Calendar .clndr-grid .today`);
        if (!$today.length && !date) return;
        date = date || $today.children().data('date').trim();

        if (!json[calendar][date]) return;

        json[calendar][date]['_complete'] = 1;
        $.each(json[calendar][date], (varName, value) => {
            if (value !== undefined && varName != "_complete" &&
                module.config[calendar].questions[varName].type != 'check' &&
                value.toString() == "") {
                json[calendar][date]['_complete'] = 0;
                return false;
            }
        });

        if (updateColor) {
            colorDayComplete(calendar, date, json[calendar][date]['_complete']);
        }

        $(`textarea[name=${calendar}]`).val(JSON.stringify(json[calendar]));
    };

    /*
    Update the color of the day on the calendar's display for a given day
    */
    const colorDayComplete = (calendar, date, isComplete) => {
        const $cal = $(`#${calendar}Calendar`);
        $cal.find(`.calendar-day-${date}`).removeClass('day-complete day-incomplete');
        if (module.config[calendar]['noFuture'] && (moment().diff(moment(date, 'YYYY-MM-DD'), 'days') <= 0)) return;
        $cal.find(`.calendar-day-${date}`).addClass(isComplete == 1 ? 'day-complete' : 'day-incomplete');
    };

    /*
    Event listener for the Mark all Button. Marks all variables in calendar as value
    */
    const calMarkAllAsValue = (calendar, variable, value) => {

        const month = $(`#${calendar}Calendar .clndr-grid .today`).children().data('date').split('-')[1];

        $.each(json[calendar], (date, data) => {
            if (date.split('-')[1] != month || data['_complete'] == 1)
                return;
            json[calendar][date][variable] = value;
        });

        $(`textarea[name=${calendar}]`).val(JSON.stringify(json[calendar]));
        loadCalendarJSON(calendar, month);
    };

    /*
    One time insert of mark all buttons
    */
    const insertMarkAllButton = (calendar, settings) => {

        const $cal = $(`#${calendar}Calendar`);
        $cal.append(module.template.btnGroup);
        const $dropDown = $cal.find('.markAllButtonGroup .dropdown-menu');

        $.each(settings['buttons'], (_, btn) => {

            // Insert the template button AND template link on button group
            $cal.append(module.template.btn.replace('TEXT', btn.text).replace('TOOLTIP', btn.tooltip));
            $cal.find('.markAllButtonGroup .dropdown-menu').append(module.template.btnLink.replace('TEXT', btn.text).replace('TOOLTIP', btn.tooltip));

            // Find the target and enable tooltip
            const $target = $cal.find('button');
            if (btn.tooltip) $target.last().tooltip();

            // Setup event listener
            const markfunc = () => calMarkAllAsValue(calendar, btn.variable, btn.value);
            $target.last().on('click', markfunc);
            $dropDown.find('.dropdown-item').last().on('click', markfunc);
        });
    };

    /*
    Update which mark-all buttons are shown based on what is currently displayed.
    */
    const updateMarkAllButtons = (calendar) => {

        // Setup and show all buttons
        const $cal = $(`#${calendar}Calendar`);
        const $dropDown = $cal.find('.markAllButtonGroup .dropdown-menu');
        $cal.parent().find(".markAllButton").show();
        $cal.find('.markAllButtonGroup').hide();
        $cal.find('.markAllButtonGroup .dropdown-item').show();
        let btnCount = 0;

        $.each(module.config[calendar].buttons, (_, btn) => {

            let $target = $cal.find(`.markAllButton:contains(${btn.text})`);
            let $ddTarget = $dropDown.find(`.dropdown-item:contains(${btn.text})`);

            // Hide buttons that aren't needed
            if (!$cal.find(`[data-variable=${btn.variable}]:visible`).length) {
                $target.hide();
                $ddTarget.hide();
            } else {
                // Hacky css stuff, don't hate me
                $target.css('transform', `translateY(${-35 * btnCount}px)`);
                btnCount += 1;
            }
        });

        if (btnCount > 2) { // Currently hard coded to 2 max 
            $cal.parent().find(".markAllButton").hide();
            $cal.find('.markAllButtonGroup').show();
        }
    };

    /*
    Setup saving on input change for a calendar
    */
    const setupSaving = (calendar) => {

        const $cal = $(`#${calendar}Calendar`);

        //Setup every save back to JSON
        $cal.find("[class^=event-item-input-]").on('click change', (event) => {
            const $target = $(event.currentTarget);
            const newVal = $target.prop('type') == "checkbox" ? ($target.is(':checked') ? '1' : '0') : $target.val();
            jsonSaveCalendar(calendar, $target.parent().data('date'), $target.data('variable'), newVal);
        });
    };

    /*
    Setup validation for a calendar, prevent junk data
    */
    const setupValidation = (calendar) => {
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
            if ((event.which != 46 || $target.val().indexOf('.') != -1) && (event.which < 48 || event.which > 57)) {
                event.preventDefault();
            }
        });
    };

    /*
    Event listener for arrow nav on the calendar
    */
    const arrowNavigation = (event) => {
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
    const applyReplaceFilter = (calendar, date) => {
        const filter = filters[calendar];
        if (!filter[date] || !filter[date].length) return;
        const $cal = $(`#${calendar}Calendar`);
        filter[date].forEach(varName => {
            $cal.find(`[data-variable=${varName}]`).parent().hide();
        });
    };

    /*
    Update the calendar to a new date
    */
    const setDate = (calendar, date) => {
        updateDayComplete(calendar, true);
        $(".today").removeClass('today');
        $(`.calendar-day-${date}`).addClass('today');
        showDateQuestions(calendar, date);
    };

    // Simple setup
    document.onkeydown = arrowNavigation;
    window['moment-range'].extendMoment(moment);

    // Loop over all config
    $.each(module.config, (calName, calSettings) => {

        // Prep the area for the calendar
        if ($(`[name=${calName}]:visible`).length == 0) return;
        $(`#${calName}-tr td`).hide()
        $(`#${calName}-tr`).append(module.template.td.replace('CALNAME', `${calName}Calendar`));

        // Load JSON from the text area
        let json = $(`textarea[name=${calName}]`).val();
        json = isEmpty(json) ? {} : JSON.parse(json);

        let events = [];
        let unique = {};
        filters[calName] = {};

        // Build out the JSON with any new range info we might have
        $.each(calSettings.range, (_, rangeObj) => {

            // Skip if start/end ranges don't exist yet
            if (!rangeObj.start || !rangeObj.end) return;

            // Loop over every day in the range
            for (let day of moment.range(rangeObj.start, rangeObj.end).by('days')) {

                const date = day.format('YYYY-MM-DD');
                filters[calName][date] = filters[calName][date] || [];
                unique[date] = unique[date] || [];

                // Init Json structure
                if (json[date] === undefined) {
                    json[date] = {};
                    json[date]["_complete"] = 0;
                }

                // Flip through all the questions for today
                $.each(calSettings.questions, (variable, question) => {

                    if (unique[date].includes(variable) ||
                        (isEmpty(json[date][variable]) && rangeObj.exclude.includes(variable))) return;

                    if (question.replace.length) {
                        filters[calName][date].push(...question.replace);
                    }

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
        json[calName] = json;

        // Init the CLNDR
        let $cal = $(`#${calName}Calendar`);
        $cal.clndr({
            template: module.template.calendar,
            events: events,
            forceSixRows: true,

            // Runs ONCE when the calendar is rendered
            ready: () => {
                insertMarkAllButton(calName, calSettings);
                updateMarkAllButtons(calName);
                showDateQuestions(calName, moment().format("YYYY-MM-DD"));
                loadCalendarJSON(calName, moment().format("MM"));
                setupSaving(calName);
                setupValidation(calName);
            },

            clickEvents: {

                // Runs when a new date is clicked (or arrowed to)
                click: (target) => {
                    const date = moment($(".clndr-grid .today").children().data('date'));
                    if (target.date.format("MM") == date.format("MM")) {
                        setDate(calName, target.date.format("YYYY-MM-DD"));
                    }
                },

                // Runs on every month change
                onMonthChange: (firstOfMonth) => {
                    let firstValidDay = $cal.find(".day.event span").first();
                    firstValidDay = moment(firstValidDay ? firstValidDay.data('date') : firstOfMonth);
                    if (firstOfMonth.format("MM") != firstValidDay.format("MM")) {
                        firstValidDay = firstOfMonth;
                    }
                    setDate(calName, firstValidDay.format("YYYY-MM-DD"));
                    showDateQuestions(calName, firstValidDay.format("YYYY-MM-DD"));
                    loadCalendarJSON(calName, firstValidDay.format("MM"));
                    setupSaving(calName);
                    setupValidation(calName);
                }
            }
        });
    });
});