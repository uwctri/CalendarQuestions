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

            colorDay(calendar, date, vars);

        });
    };

    /*
    Show the daily questions for a calendar on a date
    */
    const showDateQuestions = (calendar, ymd) => {
        const date = moment(ymd);
        const $cal = $(`#${calendar}Calendar`);
        $cal.find(`.event-item`).hide();
        if (!module.config[calendar]['noFuture'] || (moment().diff(date, 'days') > 0)) {
            $cal.find(`.event-item[data-date=${date.format('YYYY-MM-DD')}]`).show();
        }
        applyReplaceFilter(calendar, ymd);
        updateMarkAllButtons(calendar);
    };

    /*
    Save a new value for a varaible on a date, in a specific calendar 
    */
    const jsonSaveCalendar = (calendar, ymd, variable, value) => {
        json[calendar][ymd][variable] = value;
        updateDayComplete(calendar, false, ymd);
        $(`textarea[name=${calendar}]`).val(JSON.stringify(json[calendar]));
    };

    /*
    Review a specific date on a calendar to determine if all needed
    data has been collected or not. If no date is specified then the
    currently highlighted date is used and the day is recolored to
    red or green.
    */
    const updateDayComplete = (calendar, updateColor, ymd) => {

        let $today = $(`#${calendar}Calendar .clndr-grid .today`);
        if (!$today.length && !ymd) return;
        ymd = ymd || $today.children().data('date').trim();

        if (!json[calendar][ymd]) return;

        const start_complete = json[calendar][ymd]['_complete'];
        const start_partial = json[calendar][ymd]['_partial'];

        json[calendar][ymd]['_complete'] = 1;
        $.each(json[calendar][ymd], (varName, value) => {
            if (value !== undefined && varName[0] != "_" &&
                module.config[calendar].questions[varName].type != 'check') {
                if (value.toString() == "")
                    json[calendar][ymd]['_complete'] = 0;
                else
                    json[calendar][ymd]['_partial'] = 1;
            }
        });

        if (start_complete != json[calendar][ymd]['_complete'] || start_partial != json[calendar][ymd]['_partial'])
            updateStats(calendar, ymd);

        if (updateColor)
            colorDay(calendar, ymd, json[calendar][ymd]);

        $(`textarea[name=${calendar}]`).val(JSON.stringify(json[calendar]));
    };

    /*
    Update the color of the day on the calendar's display for a given day
    */
    const colorDay = (calendar, ymd, data) => {
        const newClass = data['_complete'] ? 'day-complete' : data['_partial'] ? 'day-partial' : 'day-incomplete';
        const $cal = $(`#${calendar}Calendar`);
        $cal.find(`.calendar-day-${ymd}`).removeClass('day-complete day-incomplete day-partial');
        if (module.config[calendar]['noFuture'] && (moment().diff(moment(ymd, 'YYYY-MM-DD'), 'days') <= 0)) return;
        $cal.find(`.calendar-day-${ymd}`).addClass(newClass);
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
    const applyReplaceFilter = (calendar, ymd) => {
        const filter = filters[calendar];
        if (!filter[ymd] || !filter[ymd].length) return;
        const $cal = $(`#${calendar}Calendar`);
        filter[ymd].forEach(varName => {
            $cal.find(`[data-variable=${varName}]`).parent().hide();
        });
    };

    /*
    Update the calendar to a new date
    */
    const setDate = (calendar, ymd) => {
        updateDayComplete(calendar, true);
        $(".today").removeClass('today');
        $(`.calendar-day-${ymd}`).addClass('today');
        showDateQuestions(calendar, ymd);
    };

    const updateStats = (calendar, ymd) => {
        if (!module.config[calendar].stats) return;
        const $t = $(`#${calendar}-tr`).next().find("table");
        const data = json[calendar];
        const start = moment(ymd, 'YYYY-MM-DD').startOf('month').subtract(11, 'month');
        const end = moment(ymd, 'YYYY-MM-DD').endOf('month');
        const thisMonth = moment(ymd, 'YYYY-MM-DD').startOf('month').format('YYYY-MM-DD');
        const thisTrimester = moment(ymd, 'YYYY-MM-DD').subtract(90, 'day').format('YYYY-MM-DD');
        let totals = {
            month: 0,
            trimester: 0,
            year: 0,
            month_partial: 0,
            trimester_partial: 0,
            year_partial: 0,
            month_complete: 0,
            trimester_complete: 0,
            year_complete: 0,
        };
        for (let date of moment.range(start, end).by('days')) {
            date = date.format('YYYY-MM-DD');
            if (!data[date])
                continue;
            totals.year += 1;
            if (date >= thisMonth)
                totals.month += 1;
            if (date >= thisTrimester)
                totals.trimester += 1;
            if (data[date]._complete == 1) {
                totals.year_complete += 1;
                if (date >= thisMonth)
                    totals.month_complete += 1;
                if (date >= thisTrimester)
                    totals.trimester_complete += 1;
            }
            if (data[date]._partial == 1) {
                totals.year_partial += 1;
                if (date >= thisMonth)
                    totals.month_partial += 1;
                if (date >= thisTrimester)
                    totals.trimester_partial += 1;
            }
        }
        $t.find(".a1").text(`${totals.month_partial} / ${totals.month}`);
        $t.find(".a2").text(`${totals.trimester_partial} / ${totals.trimester}`);
        $t.find(".a3").text(`${totals.year_partial} / ${totals.year}`);
        $t.find(".b1").text(`${totals.month_complete} / ${totals.month}`);
        $t.find(".b2").text(`${totals.trimester_complete} / ${totals.trimester}`);
        $t.find(".b3").text(`${totals.year_complete} / ${totals.year}`);
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

        // Insert stats row
        if (calSettings.stats)
            $(`#${calName}-tr`).after(module.template.stats);

        // Load JSON from the text area into temp Json var
        let tmp = $(`textarea[name=${calName}]`).val();
        tmp = isEmpty(tmp) ? {} : JSON.parse(tmp);

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
                tmp[date] ??= {};
                tmp[date]["_complete"] ??= 0;
                tmp[date]["_partial"] ??= 0;

                // Flip through all the questions for today
                $.each(calSettings.questions, (variable, question) => {

                    if (unique[date].includes(variable) ||
                        (isEmpty(tmp[date][variable]) && rangeObj.exclude.includes(variable))) return;

                    if (question.replace.length) {
                        filters[calName][date].push(...question.replace);
                    }

                    unique[date].push(variable);
                    tmp[date][variable] = tmp[date][variable] || "";
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
        json[calName] = tmp;

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
                updateStats(calName, moment().format("YYYY-MM-DD"));
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
                    updateStats(calName, firstValidDay.format("YYYY-MM-DD"));
                }
            }
        });
    });
});