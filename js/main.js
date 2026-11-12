$(document).ready(() => {

    let json = {}
    let filters = {}
    let activeQuestions = {}
    let excludes = {}
    let module = ExternalModules.UWMadison.CalendarQuestions
    const compressLimit = Math.pow(2, 16) - 4000

    const TEMPLATES = {
        td: '<td class="labelrc col-12" colspan="3"><div class="clndr" id="CALNAME"></div></td>',
        btn: '<button type="button" class="btn btn-dark btn-sm markAllButton" data-bs-toggle="tooltip" data-toggle="tooltip" title="TOOLTIP">TEXT</button>',
        btnLink: '<a class="dropdown-item" href="#" title="TOOLTIP">TEXT</a>',
        btnGroup: `<div class="btn-group markAllButtonGroup">
  <button class="btn btn-dark btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" data-toggle="dropdown">
    Mark all...
  </button>
  <div class="dropdown-menu"></div>
</div>`,
        stats: `<tr class="clndr-stats">
  <td colspan="3">
    <table class="table mb-0 font-weight-bold">
      <tbody>
        <tr>
          <td></td>
          <td>This Month</td>
          <td>Past 90 Days</td>
          <td>Past Year</td>
        </tr>
        <tr>
          <td>Partial Data</td>
          <td class="a1">? / ?</td>
          <td class="a2">? / ?</td>
          <td class="a3">? / ?</td>
        </tr>
        <tr>
          <td>All Data</td>
          <td class="b1">? / ?</td>
          <td class="b2">? / ?</td>
          <td class="b3">? / ?</td>
        </tr>
      </tbody>
    </table>
  </td>
</tr>`
    }

    /*
    Safe local empty checker
    */
    const isEmpty = (val) => {
        return val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)
    }

    /*
    Show the out of space pop-up message (survey-safe)
    */
    const outOfSpaceWarning = () => {
        if (typeof Swal !== 'undefined' && Swal.fire) {
            Swal.fire({
                title: "Space Issue!",
                text: "The Calendar Question field on this page is nearly out of space. Consider enabling compression in the EM settings.",
                icon: "warning"
            })
        } else {
            alert("The Calendar Question field on this page is nearly out of space. Consider enabling compression in the EM settings.")
        }
    }

    /*
    Parse and load onto the screen data for a specific calendar and month
    */
    const loadCalendarJSON = (calendar, month, year) => {
        const $cal = $(`#${calendar}Calendar`)

        // Loop over data for the month
        $.each(json[calendar] || {}, (date, vars) => {
            $.each(vars, (varName, value) => {
                if (varName[0] === "_" || (dayjs(date).format("MM") !== month) || (dayjs(date).format("YYYY") !== year)) return
                let search = `.event-item[data-date=${date}] *[data-variable=${varName}]`

                // Check for variables that were removed from the config
                if (typeof module.config[calendar].questions[varName] === "undefined") return
                const type = module.config[calendar].questions[varName].type

                // Enter data based on the format
                if (["text", "int", "float"].includes(type)) {
                    $cal.find(search).val(value)
                } else if (!isEmpty(value) && type === "yesno") {
                    $cal.find(search + `[value=${value}]`).prop('checked', true)
                } else if (!isEmpty(value) && value === '1' && type === "check") {
                    $cal.find(search).prop('checked', true)
                }
            })
            colorDay(calendar, date, vars)
        })
    }

    /*
    Show the daily questions for a calendar on a date
    */
    const showDateQuestions = (calendar, ymd) => {
        const date = dayjs(ymd)
        const $cal = $(`#${calendar}Calendar`)
        $cal.find(`.event-item`).hide()

        if (!module.config[calendar].noFuture || !date.isAfter(dayjs(), 'day')) {
            $cal.find(`.event-item[data-date=${date.format('YYYY-MM-DD')}]`).show()
            let hideExcludes = excludes[calendar][ymd] || []
            hideExcludes.forEach(variable => {
                // Issue #11: If alwaysShowData is enabled and field already has data, do not hide it
                if (module.config[calendar].alwaysShowData && !isEmpty(json[calendar]?.[ymd]?.[variable])) {
                    return
                }
                $cal.find(`.event-item[data-date=${date.format('YYYY-MM-DD')}] *[data-variable=${variable}]`).closest('.event-item').hide()
            })
        }
        applyReplaceFilter(calendar, ymd)
        updateMarkAllButtons(calendar)
    }

    /*
    Save a new value for a variable on a date in a specific calendar
    */
    const saveCalendarJSON = (calendar) => {
        const tmp = JSON.stringify(json[calendar])
        if (module.config[calendar].compress && (tmp.length > compressLimit)) {
            compress(tmp).then((compressed) => {
                $(`textarea[name=${calendar}]`).val(compressed)
            })
            return
        }
        $(`textarea[name=${calendar}]`).val(tmp)
    }

    /*
    Review a specific date on a calendar to determine if all needed data has been collected
    */
    const updateDayComplete = (calendar, updateColor, ymd) => {
        let $today = $(`#${calendar}Calendar .clndr-grid .today`)
        if (!$today.length && !ymd) return
        ymd = ymd || $today.find('.day-number').data('date')?.toString().trim()

        if (!json[calendar] || !json[calendar][ymd]) return

        const start_complete = json[calendar][ymd]['_complete']
        const start_partial = json[calendar][ymd]['_partial']
        let isComplete = true
        let isPartial = false

        $.each(activeQuestions[calendar][ymd] || [], (_, varName) => {
            const question = module.config[calendar].questions[varName]
            if (!question || question.type === 'check') return

            const value = json[calendar][ymd][varName]
            if (value === undefined || value === null || value.toString() === "") {
                isComplete = false
            } else {
                isPartial = true
            }
        })

        json[calendar][ymd]['_complete'] = isComplete ? 1 : 0
        json[calendar][ymd]['_partial'] = isPartial ? 1 : 0

        if (start_complete !== json[calendar][ymd]['_complete'] || start_partial !== json[calendar][ymd]['_partial']) {
            updateStats(calendar, ymd)
        }

        if (updateColor) {
            colorDay(calendar, ymd, json[calendar][ymd])
        }
    }

    /*
    Update the color of the day on the calendar's display for a given day
    */
    const colorDay = (calendar, ymd, data) => {
        const newClass = data['_complete'] ? 'day-complete' : (data['_partial'] ? 'day-partial' : 'day-incomplete')
        const $cal = $(`#${calendar}Calendar`)
        $cal.find(`.calendar-day-${ymd}`).removeClass('day-complete day-incomplete day-partial')
        if (module.config[calendar].noFuture && dayjs(ymd).isAfter(dayjs(), 'day')) return
        $cal.find(`.calendar-day-${ymd}`).addClass(newClass)
    }

    /*
    Event listener for Mark All Button
    */
    const calMarkAllAsValue = (calendar, variable, value) => {
        const todayDate = $(`#${calendar}Calendar .clndr-grid .today`).find('.day-number').data('date')?.toString().trim().split('-')
        if (!todayDate || todayDate.length < 2) return
        const year = todayDate[0]
        const month = todayDate[1]

        $.each(json[calendar], (date, data) => {
            if (date.split('-')[1] !== month || date.split('-')[0] !== year || data['_complete'] === 1) return
            if (excludes[calendar][date] && excludes[calendar][date].includes(variable)) return
            if (filters[calendar][date] && filters[calendar][date].includes(variable)) return
            if (module.config[calendar].noFuture && dayjs(date).isAfter(dayjs(), 'day')) return

            json[calendar][date][variable] = value
            updateDayComplete(calendar, true, date)
        })

        saveCalendarJSON(calendar)
        loadCalendarJSON(calendar, month, year)
    }

    /*
    Insert Mark All buttons
    */
    const insertMarkAllButton = (calendar, settings) => {
        const $cal = $(`#${calendar}Calendar`)
        $cal.find('.markAllButton, .markAllButtonGroup').remove()
        if (!settings['buttons'] || !settings['buttons'].length) return

        $cal.append(TEMPLATES.btnGroup)
        const $dropDown = $cal.find('.markAllButtonGroup .dropdown-menu')

        $.each(settings['buttons'] || [], (_, btn) => {
            const btnHtml = TEMPLATES.btn
                .replace('TEXT', btn.text)
                .replace(btn.tooltip ? 'TOOLTIP' : `title="TOOLTIP"`, btn.tooltip ? btn.tooltip : "")
            const $btn = $(btnHtml)
            $cal.append($btn)

            const linkHtml = TEMPLATES.btnLink
                .replace('TEXT', btn.text)
                .replace(btn.tooltip ? 'TOOLTIP' : `title="TOOLTIP"`, btn.tooltip ? btn.tooltip : "")
            const $link = $(linkHtml)
            $dropDown.append($link)

            if (btn.tooltip && $.fn.tooltip) $btn.tooltip()

            const markfunc = () => calMarkAllAsValue(calendar, btn.variable, btn.value)
            $btn.on('click', markfunc)
            $link.on('click', markfunc)
        })
    }

    /*
    Update which mark-all buttons are shown based on what is currently displayed
    */
    const updateMarkAllButtons = (calendar) => {
        const $cal = $(`#${calendar}Calendar`)
        const $dropDown = $cal.find('.markAllButtonGroup .dropdown-menu')
        $cal.find(".markAllButton").show()
        $cal.find('.markAllButtonGroup').hide()
        $cal.find('.markAllButtonGroup .dropdown-item').show()
        let btnCount = 0

        $.each(module.config[calendar].buttons || [], (_, btn) => {
            let $target = $cal.find(`.markAllButton:contains(${btn.text})`)
            let $ddTarget = $dropDown.find(`.dropdown-item:contains(${btn.text})`)

            if (!$cal.find(`[data-variable=${btn.variable}]:visible`).length) {
                $target.hide()
                $ddTarget.hide()
            } else {
                $target.css('transform', `translateY(${-35 * btnCount}px)`)
                btnCount += 1
            }
        })

        if (btnCount > 2) {
            $cal.find(".markAllButton").hide()
            $cal.find('.markAllButtonGroup').show()
        }
    }

    /*
    Setup saving on input change for a calendar
    */
    const setupSaving = (calendar) => {
        const $cal = $(`#${calendar}Calendar`)
        $cal.off('click change', "[class^=event-item-input-]").on('click change', "[class^=event-item-input-]", (event) => {
            const $target = $(event.currentTarget)
            const newVal = $target.prop('type') === "checkbox" ? ($target.is(':checked') ? '1' : '0') : $target.val()
            const ymd = $target.closest('.event-item').data('date')
            const variable = $target.data('variable')
            if (!ymd || !variable) return

            json[calendar][ymd] = json[calendar][ymd] || {}
            json[calendar][ymd][variable] = newVal
            updateDayComplete(calendar, false, ymd)
            saveCalendarJSON(calendar)
        })
    }

    /*
    Setup validation for a calendar to prevent junk data
    */
    const setupValidation = (calendar) => {
        const $cal = $(`#${calendar}Calendar`)

        $cal.find(`.event-item-input-int`).off("keypress keyup blur").on("keypress keyup blur", (event) => {
            const $target = $(event.currentTarget)
            const isNeg = (event.which === 45) || ($target.val().startsWith("-"))
            $target.val((isNeg ? "-" : "") + $target.val().replace(/[^0-9]/g, ""))
            if (event.which !== 45 && (event.which < 48 || event.which > 57) && event.which > 31) {
                event.preventDefault()
            }
        })

        $cal.find(`.event-item-input-float`).off("keypress keyup blur").on("keypress keyup blur", (event) => {
            const $target = $(event.currentTarget)
            const isNeg = (event.which === 45) || ($target.val().startsWith("-"))
            $target.val((isNeg ? "-" : "") + $target.val().replace(/[^0-9.]/g, ""))
            if (event.which !== 45 && (event.which !== 46 || $target.val().indexOf('.') !== -1) && (event.which < 48 || event.which > 57) && event.which > 31) {
                event.preventDefault()
            }
        })
    }

    /*
    Event listener for arrow nav on the calendar
    */
    const arrowNavigation = (event) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable) {
            return
        }

        const arrowMap = {
            "ArrowLeft": -1,
            "ArrowUp": -7,
            "ArrowRight": 1,
            "ArrowDown": 7
        }
        if (!Object.keys(arrowMap).includes(event.key)) return

        const $activeDay = $(".clndr-grid .today").find('.day-number')
        if (!$activeDay.length) return

        const date = dayjs($activeDay.data('date'))
        const newDate = date.add(arrowMap[event.key], 'day')
        const $el = $(`.calendar-day-${newDate.format("YYYY-MM-DD")}`)
        if ($el.length) {
            $el.click()
            event.preventDefault()
            $(".clndr:visible").find('input:visible, textarea:visible').first().focus()
        }
    }

    /*
    Apply filters for replace questions logic on a calendar for specific date
    */
    const applyReplaceFilter = (calendar, ymd) => {
        const filter = filters[calendar]
        if (!filter || !filter[ymd] || !filter[ymd].length) return
        const $cal = $(`#${calendar}Calendar`)

        filter[ymd].forEach(varName => {
            // Issue #11: If alwaysShowData is enabled and field already has data, do not hide it
            if (module.config[calendar].alwaysShowData && !isEmpty(json[calendar]?.[ymd]?.[varName])) {
                return
            }
            $cal.find(`.event-item[data-date=${ymd}] *[data-variable=${varName}]`).closest('.event-item').hide()
        })
    }

    /*
    Update the calendar to a new date
    */
    const setDate = (calendar, ymd) => {
        updateDayComplete(calendar, true)
        const $cal = $(`#${calendar}Calendar`)
        $cal.find(".today").removeClass('today')
        $cal.find(`.calendar-day-${ymd}`).addClass('today')
        showDateQuestions(calendar, ymd)
        saveCalendarJSON(calendar)
    }

    const isCompressed = (string) => {
        return typeof string === "string" && string.startsWith("H4sIA")
    }

    const compress = async (string) => {
        const byteArray = new TextEncoder().encode(string)
        const cs = new CompressionStream("gzip")
        const writer = cs.writable.getWriter()
        writer.write(byteArray)
        writer.close()
        const buf = await new Response(cs.readable).arrayBuffer()
        const bytes = new Uint8Array(buf)
        let binary = ''
        const chunk = 8192
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
        }
        return btoa(binary)
    }

    const decompress = async (string) => {
        const binString = atob(string)
        let bytes = new Uint8Array(binString.length)
        bytes = bytes.map((el, i) => binString.charCodeAt(i))
        const cs = new DecompressionStream("gzip")
        const writer = cs.writable.getWriter()
        writer.write(bytes)
        writer.close()
        return new Response(cs.readable).arrayBuffer().then(function (arrayBuffer) {
            return new TextDecoder().decode(arrayBuffer)
        })
    }

    /*
    Update the stats row for a calendar
    */
    const updateStats = (calendar, ymd) => {
        if (!module.config[calendar].stats) return
        const $t = $(`#${calendar}-tr`).next().find("table")
        const data = json[calendar] || {}
        const baseDate = dayjs(ymd)
        const start = baseDate.startOf('month').subtract(11, 'month')
        const end = baseDate.endOf('month')
        const thisMonth = baseDate.startOf('month').format('YYYY-MM-DD')
        const thisTrimester = baseDate.subtract(90, 'day').format('YYYY-MM-DD')

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
        }

        for (let d = start; d.isBefore(end) || d.isSame(end, 'day'); d = d.add(1, 'day')) {
            const date = d.format('YYYY-MM-DD')
            if (!data[date]) continue

            totals.year += 1
            if (date >= thisMonth) totals.month += 1
            if (date >= thisTrimester) totals.trimester += 1

            if (data[date]._complete === 1) {
                totals.year_complete += 1
                if (date >= thisMonth) totals.month_complete += 1
                if (date >= thisTrimester) totals.trimester_complete += 1
            }
            if (data[date]._partial === 1) {
                totals.year_partial += 1
                if (date >= thisMonth) totals.month_partial += 1
                if (date >= thisTrimester) totals.trimester_partial += 1
            }
        }

        $t.find(".a1").text(`${totals.month_partial} / ${totals.month}`)
        $t.find(".a2").text(`${totals.trimester_partial} / ${totals.trimester}`)
        $t.find(".a3").text(`${totals.year_partial} / ${totals.year}`)
        $t.find(".b1").text(`${totals.month_complete} / ${totals.month}`)
        $t.find(".b2").text(`${totals.trimester_complete} / ${totals.trimester}`)
        $t.find(".b3").text(`${totals.year_complete} / ${totals.year}`)
    }

    /*
    Native, lightweight replacement for CLNDR (zero external dependencies)
    Renders identical DOM hierarchy and CSS classes
    */
    const renderCalendarGrid = ($target, options) => {
        let currentMonthDate = dayjs().startOf('month')
        const events = options.events || []
        const eventDates = new Set(events.map(e => e.date))

        const render = () => {
            const monthName = currentMonthDate.format('MMMM')
            const yearName = currentMonthDate.format('YYYY')
            const firstDayOfWeek = currentMonthDate.day() // 0 = Sunday
            const gridStartDate = currentMonthDate.subtract(firstDayOfWeek, 'day')

            // Build Controls
            let html = `
            <div class="clndr-controls">
                <div class="clndr-previous-button">‹</div>
                <div class="month">${monthName} ${yearName}</div>
                <div class="clndr-next-button">›</div>
            </div>
            <div class="clndr-grid">
                <div class="days-of-the-week clearfix">
                    <div class="header-day">Sun</div>
                    <div class="header-day">Mon</div>
                    <div class="header-day">Tue</div>
                    <div class="header-day">Wed</div>
                    <div class="header-day">Thu</div>
                    <div class="header-day">Fri</div>
                    <div class="header-day">Sat</div>
                </div>
                <div class="days clearfix">`

            // 6 rows * 7 days = 42 cells (forceSixRows equivalent)
            for (let i = 0; i < 42; i++) {
                const day = gridStartDate.add(i, 'day')
                const ymd = day.format('YYYY-MM-DD')
                const isAdjacent = day.month() !== currentMonthDate.month()
                const isToday = ymd === dayjs().format('YYYY-MM-DD')
                const hasEvent = eventDates.has(ymd)

                let classes = ['day', `calendar-day-${ymd}`]
                if (isAdjacent) {
                    classes.push('adjacent-month')
                } else {
                    classes.push(`my-${ymd}`)
                }
                if (isToday) classes.push('today')
                if (hasEvent) classes.push('event')

                html += `<div class="${classes.join(' ')}" id="calendar-day-${ymd}">
                    <span class="day-number" data-date="${ymd}">${day.date()}</span>
                </div>`
            }

            html += `</div></div>`

            // Build Question Event Listing
            const eventsThisMonth = events.filter(e => {
                const ed = dayjs(e.date)
                return ed.month() === currentMonthDate.month() && ed.year() === currentMonthDate.year()
            })

            html += `<div class="event-listing">
                <div class="event-listing-title">Questions</div>`

            eventsThisMonth.forEach(event => {
                const isFlex = event.type === "check" ? ' style="display:flex"' : ''
                html += `<div class="event-item"${isFlex} data-date="${event.date}">`

                if (event.type === "check") {
                    html += `<input name="${event.variable}-${event.date}-checkbox" class="event-item-input-checkbox" type="checkbox" data-variable="${event.variable}">`
                }

                html += `<div class="event-item-question">${event.question}</div>`

                if (["text", "float", "int"].includes(event.type)) {
                    html += `<textarea rows="1" class="event-item-input-${event.type}" data-variable="${event.variable}"></textarea>`
                } else if (event.type === "yesno") {
                    html += `<input name="${event.variable}-${event.date}-radio" class="event-item-input-yesno" type="radio" data-variable="${event.variable}" value="1"><span class="event-item-input-label">Yes</span>`
                    html += `<input name="${event.variable}-${event.date}-radio" class="event-item-input-yesno" type="radio" data-variable="${event.variable}" value="0"><span class="event-item-input-label">No</span>`
                }

                html += `</div>`
            })

            html += `</div>`

            $target.html(html)

            // Attach Month navigation handlers
            $target.find('.clndr-previous-button').on('click', () => {
                currentMonthDate = currentMonthDate.subtract(1, 'month').startOf('month')
                render()
                if (options.clickEvents && options.clickEvents.onMonthChange) {
                    options.clickEvents.onMonthChange(currentMonthDate)
                }
            })

            $target.find('.clndr-next-button').on('click', () => {
                currentMonthDate = currentMonthDate.add(1, 'month').startOf('month')
                render()
                if (options.clickEvents && options.clickEvents.onMonthChange) {
                    options.clickEvents.onMonthChange(currentMonthDate)
                }
            })

            // Attach Day click handlers
            $target.find('.clndr-grid .day').on('click', function () {
                const dateYmd = $(this).find('.day-number').data('date')
                if (!dateYmd) return
                const clickedDate = dayjs(dateYmd)
                if (options.clickEvents && options.clickEvents.click) {
                    options.clickEvents.click({
                        date: clickedDate,
                        element: this
                    })
                }
            })
        }

        render()

        if (typeof options.ready === 'function') {
            options.ready()
        }
    }

    /*
    One time setup for the calendar, run when doc is ready
    */
    const setup = () => {
        document.onkeydown = arrowNavigation

        $.each(module.config || {}, async (calName, calSettings) => {
            if ($(`[name=${calName}]:visible`).length === 0) return
            $(`#${calName}-tr td`).hide()
            $(`#${calName}-tr`).append(TEMPLATES.td.replace('CALNAME', `${calName}Calendar`))

            if (calSettings.stats) {
                $(`#${calName}-tr`).after(TEMPLATES.stats)
            }

            let tmp = $(`textarea[name=${calName}]`).val() || ""
            const tmpLength = tmp.length
            try {
                tmp = isCompressed(tmp) ? await decompress(tmp) : tmp
                tmp = isEmpty(tmp) ? {} : JSON.parse(tmp)
            } catch (e) {
                console.error("CalendarQuestions: Failed to parse calendar data JSON:", e)
                tmp = {}
            }

            if (!calSettings.compress && tmpLength > compressLimit) {
                outOfSpaceWarning()
            }

            let events = []
            let unique = {}
            filters[calName] = {}
            excludes[calName] = {}
            activeQuestions[calName] = {}

            $.each(calSettings.range || [], (_, rangeObj) => {
                if (!rangeObj.start || !rangeObj.end) return

                for (let day = dayjs(rangeObj.start); day.isBefore(rangeObj.end) || day.isSame(rangeObj.end, 'day'); day = day.add(1, 'day')) {
                    const date = day.format('YYYY-MM-DD')
                    filters[calName][date] = filters[calName][date] || []
                    excludes[calName][date] = excludes[calName][date] || []
                    unique[date] = unique[date] || []
                    activeQuestions[calName][date] = activeQuestions[calName][date] || []

                    tmp[date] = tmp[date] || {}
                    tmp[date]["_complete"] = tmp[date]["_complete"] ?? 0
                    tmp[date]["_partial"] = tmp[date]["_partial"] ?? 0

                    if (rangeObj.exclude && rangeObj.exclude.length) {
                        excludes[calName][date].push(...rangeObj.exclude)
                    }

                    (rangeObj.exclude || []).forEach(variable => {
                        if (!variable.startsWith("!")) return
                        const includeVar = variable.substring(1)
                        excludes[calName][date] = excludes[calName][date].filter(v => v !== variable && v !== includeVar)
                    })

                    $.each(calSettings.questions || {}, (variable, question) => {
                        const hasExistingData = !isEmpty(tmp[date][variable])

                        if (unique[date].includes(variable) ||
                            (!hasExistingData && excludes[calName][date].includes(variable))) {
                            return
                        }

                        if (!question.logic) return

                        if (question.replace && question.replace.length) {
                            filters[calName][date].push(...question.replace)
                        }

                        unique[date].push(variable)
                        activeQuestions[calName][date].push(variable)
                        tmp[date][variable] = tmp[date][variable] || ""
                        events.push({
                            index: question.index,
                            date: date,
                            question: question.text,
                            type: question.type,
                            variable: variable
                        })
                    })
                }
            })

            $.each(activeQuestions[calName], (date, variables) => {
                activeQuestions[calName][date] = variables.filter(variable => {
                    // Issue #11: If alwaysShowData is enabled and data exists, retain in active questions
                    if (calSettings.alwaysShowData && !isEmpty(tmp[date]?.[variable])) {
                        return true
                    }
                    return !filters[calName][date].includes(variable) && !excludes[calName][date].includes(variable)
                })
            })

            events.sort((a, b) => (b.index < a.index) ? 1 : -1)
            json[calName] = tmp

            let $cal = $(`#${calName}Calendar`)
            renderCalendarGrid($cal, {
                events: events,
                ready: () => {
                    insertMarkAllButton(calName, calSettings)
                    updateMarkAllButtons(calName)
                    showDateQuestions(calName, dayjs().format("YYYY-MM-DD"))
                    loadCalendarJSON(calName, dayjs().format("MM"), dayjs().format("YYYY"))
                    setupSaving(calName)
                    setupValidation(calName)
                    updateStats(calName, dayjs().format("YYYY-MM-DD"))
                },
                clickEvents: {
                    click: (target) => {
                        const $todaySpan = $cal.find(".clndr-grid .today").find('.day-number')
                        const activeYmd = $todaySpan.length ? $todaySpan.data('date') : dayjs().format("YYYY-MM-DD")
                        const activeDate = dayjs(activeYmd)
                        if (target.date.format("MM") === activeDate.format("MM")) {
                            setDate(calName, target.date.format("YYYY-MM-DD"))
                        }
                    },
                    onMonthChange: (firstOfMonth) => {
                        let firstValidDay = $cal.find(".day.event:not(.adjacent-month) span").first()
                        firstValidDay = dayjs(firstValidDay.length && firstValidDay.data('date') ? firstValidDay.data('date') : firstOfMonth)
                        if (firstOfMonth.format("MM") !== firstValidDay.format("MM")) {
                            firstValidDay = firstOfMonth
                        }
                        insertMarkAllButton(calName, calSettings)
                        setDate(calName, firstValidDay.format("YYYY-MM-DD"))
                        showDateQuestions(calName, firstValidDay.format("YYYY-MM-DD"))
                        loadCalendarJSON(calName, firstValidDay.format("MM"), firstValidDay.format("YYYY"))
                        setupSaving(calName)
                        setupValidation(calName)
                        updateStats(calName, firstValidDay.format("YYYY-MM-DD"))
                    }
                }
            })
        })
    }

    setup()
})
