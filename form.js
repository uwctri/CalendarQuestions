calQuestions.html = {};
calQuestions.fn = {};
calQuestions.html.row = `
<td class="labelrc col-12" colspan="3">
<div class="clndr" id="CALNAME"></div>
</td>`;

calQuestions.html.template = `
<div class="clndr-controls">
  <div class="clndr-previous-button">‹</div>
  <div class="month"><%= month %></div>
  <div class="clndr-next-button">›</div>
</div>
<div class="clndr-grid">
  <div class="days-of-the-week clearfix">
    <% _.each(daysOfTheWeek, function(day) { %>
      <div class="header-day"><%= day %></div>
    <% }); %>
  </div>
  <div class="days clearfix">
    <% _.each(days, function(day) { %>
      <div class="<%= day.classes %>" id="<%= day.id %>">
        <span class="day-number"><%= day.day %></span>
      </div>
    <% }); %>
  </div>
</div>
<div class="event-listing">
  <div class="event-listing-title">Questions</div>
  <% _.each(eventsThisMonth, function(event) { %>
      <div class="event-item" <% if(event.type == "check") { %> style="display:flex"  <% } %> data-date="<%= event.date %>">
        <% if(event.type == "check") { %> 
        <input name="<%= event.variable %>-<%= event.date %>-checkbox" class="event-item-input-checkbox" type="checkbox" data-variable="<%= event.variable %>" >
        <% } %>
        <div class="event-item-question"><%= event.question %></div>
        <% if( ["text","float","int"].includes(event.type) ) { %> 
        <textarea rows="1" class="event-item-input-<%= event.type %>" data-variable="<%= event.variable %>" ></textarea>
        <% } %>
        <% if(event.type == "yesno") { %> 
        <input name="<%= event.variable %>-<%= event.date %>-radio" class="event-item-input-yesno" type="radio" data-variable="<%= event.variable %>" value="1"><span class="event-item-input-label">Yes</span>
        <input name="<%= event.variable %>-<%= event.date %>-radio" class="event-item-input-yesno" type="radio" data-variable="<%= event.variable %>" value="0"><span class="event-item-input-label">No</span>
        <% } %>
      </div>
    <% }); %>
</div>`;

calQuestions.fn.clearCalendarData = function(calendar) {
    $(`textarea[name=${calendar}]`).val('{}');
}

calQuestions.fn.loadCalendarJSON = function(calendar) {
    $cal = $(`#${calendar}Calendar`);
    $.each( calQuestions.json[calendar], function(date,vars) {
        $.each( vars, function(varName, value) {
            if( varName[0] == "_" )
                return;
            $el = $cal.find(`.event-item[data-date=${date}] *[data-variable=${varName}]`);
            if ( $el.is('.event-item-input-text, .event-item-input-int, .event-item-input-float') ) {
                $el.val(value);
            }
            else if ( !isEmpty(value) && $el.is('.event-item-input-yesno') ) {
                $el.find(`.event-item-input-yesno[value=${value}]`).attr('checked', true);
            }
            else if ( !isEmpty(value) && value == '1' ) {
                $el.attr('checked', true);
            }
        }); 
        calQuestions.fn.colorDayComplete(calendar, vars['_complete'], date);
    });
}

calQuestions.fn.showDateQuestions = function(calendar, date) {
    $cal = $(`#${calendar}Calendar`);
    $cal.find(`.event-item`).hide();
    if ( !calQuestions.config[calendar]['noFuture'] || 
         (calQuestions.config[calendar]['noFuture'] && (moment().diff(date,'days') > 0) ) )
        $cal.find(`.event-item[data-date=${date.format('YYYY-MM-DD')}]`).show();
}

calQuestions.fn.jsonSaveCalendar = function(calendar, date, variable, value) {
    calQuestions.json[calendar][date][variable] = value;
    calQuestions.json[calendar][date]['_complete'] = Object.entries(calQuestions.json[calendar][date]).map(x=>x[1]).filter(x => x !== undefined).every(x=>x) ? '1' : '0';
    $(`textarea[name=${calendar}]`).val(JSON.stringify(calQuestions.json[calendar]));
}

calQuestions.fn.colorDayComplete = function(calendar, isComplete, date) {
    $cal = $(`#${calendar}Calendar`);
    $cal.find(`.calendar-day-${date}`).removeClass('day-complete day-incomplete');
    if ( calQuestions.config[calendar]['noFuture'] && (moment().diff(moment(date,'YYYY-MM-DD'),'days') <= 0) )
        return;
    if ( isComplete == '1' ) {
        $cal.find(`.calendar-day-${date}`).addClass('day-complete');
    } else {
        $cal.find(`.calendar-day-${date}`).addClass('day-incomplete');
    }
}

calQuestions.fn.calMarkAllAsValue = function(calendar, variable, value) {
    $cal = $(`#${calendar}Calendar`);
    if ( $cal.find(`[data-variable=${variable}][value=${value}]`).length )
        $cal.find(`[data-variable=${variable}][value=${value}]`).filter( function() {
            return ( moment().diff(moment($(this).parent().data('date'),'YYYY-MM-DD'),'days') > 0 && $cal.find(`[name=$(this).attr('name')][value!=${value}]:checked`).length == 0 ) 
        }).attr('checked', true).click();
    else
        $cal.find(`[data-variable=${variable}]`).filter( function() {
            return ( moment().diff(moment($(this).parent().data('date'),'YYYY-MM-DD'),'days') > 0 && $(this).val() == "" )
        }).val(value).change();
}

calQuestions.fn.insertMarkAllButton = function(calendar, variable, value, buttonText, tooltip) {
    const template = `<button type="button" class="btn btn-dark btn-sm markAllButton" data-toggle="tooltip" title="TOOLTIP">TEXT</button>`;
    $(`#${calendar}Calendar`).append(template.replace('TEXT',buttonText).replace('TOOLTIP',tooltip));
    let target = `#${calendar}Calendar button`;
    if ( tooltip )
        $(target).last().tooltip();
    else
        $(target).last().attr('title','');
    $(target).last().on('click', function() {
        calQuestions.fn.calMarkAllAsValue(calendar, variable, value);
    });
    adjustCSS();
    
    function adjustCSS() {
        if ( $(target).first().css('top') )
            $(target).last().css('top',$(target).first().css('top').replace('px','')-(35*($(target).length-1)));
        setTimeout(adjustCSS, 250);
    }
}

calQuestions.fn.setupSaving = function(calendar) {
    $cal = $(`#${calendar}Calendar`);
    //Setup every save back to JSON
    $cal.find(".event-item-input-text, .event-item-input-float, .event-item-input-int").on('change', function() {
        calQuestions.fn.jsonSaveCalendar(calendar, $(this).parent().data('date'), $(this).data('variable'), $(this).val());
        calQuestions.fn.colorDayComplete(calendar, calQuestions.json[calendar][$(this).parent().data('date')]['_complete'], $(this).parent().data('date'));
    });
    $cal.find(".event-item-input-yesno").on('click', function() {
        calQuestions.fn.jsonSaveCalendar(calendar, $(this).parent().data('date'), $(this).data('variable'), $(this).val());
        calQuestions.fn.colorDayComplete(calendar, calQuestions.json[calendar][$(this).parent().data('date')]['_complete'], $(this).parent().data('date'));
    });
    $cal.find(".event-item-input-checkbox").on('click', function() {
        calQuestions.fn.jsonSaveCalendar(calendar, $(this).parent().data('date'), $(this).data('variable'), $(this).is(':checked') ? '1' : '0');
        calQuestions.fn.colorDayComplete(calendar, calQuestions.json[calendar][$(this).parent().data('date')]['_complete'], $(this).parent().data('date'));
    });
}

calQuestions.fn.setupValidation = function(calendar) {
    $cal = $(`#${calendar}Calendar`);
    
    //Setup validation
    $cal.find(`.event-item-input-int`).on("keypress keyup blur",function (event) {
        $(this).val($(this).val().replace(/[^\d].+/, ""));
        if ((event.which < 48 || event.which > 57))
            event.preventDefault();
    });
    $cal.find(`.event-item-input-float`).on("keypress keyup blur",function (event) {
        $(this).val($(this).val().replace(/[^0-9\.]/g,''));
        if ((event.which != 46 || $(this).val().indexOf('.') != -1) && (event.which < 48 || event.which > 57))
            event.preventDefault();
    });
}

calQuestions.fn.arrowNavigation = function(e) {
    let YM = $("div.today").attr('class').split('calendar-day-')[1].split(' ')[0].slice(0,-2);
    let day = Number($("div.today .day-number").text());
    let arrowMap = {
        "ArrowLeft": -1,
        "ArrowUp": -7,
        "ArrowRight": 1,
        "ArrowDown": 7
    }
    if (!Object.keys(arrowMap).includes(event.key)) return;
    day = day + arrowMap[event.key];
    if ( $(`.calendar-day-${YM+LZ(day)}`).length ) {
        $(`.calendar-day-${YM+LZ(day)}`).click();
        e.preventDefault(); // prevent the default action (scroll / move caret)
    }
};

$(document).ready(function () {
    
    // Simple setup
    document.onkeydown = calQuestions.fn.arrowNavigation;
    calQuestions.json = {};
    window['moment-range'].extendMoment(moment);
    
    // Loop over all config
    $.each( calQuestions.config, function(calName, calObj) {
        
        // Prep the area for the calendar
        if ( $(`[name=${calName}]`).length == 0) 
            return;
        $(`#${calName}-tr td`).hide()
        $(`#${calName}-tr`).append(calQuestions.html.row.replace('CALNAME',`${calName}Calendar`));
        
        // Load JSON from the text area
        let json = $(`textarea[name=${calName}]`).val();
        json = isEmpty(json) ? {} : JSON.parse(json);
        
        let events = [];
        let unique = [];
        let blanks = [];
        
        // Build out the JSON with any new range info we might have
        $.each(calObj.range, function(_,rangeObj) {
            if ( !rangeObj.start || !rangeObj.end )
                return;
            for (let day of moment.range(rangeObj.start,rangeObj.end).by('days')) {
                let dayYMD = day.format('YYYY-MM-DD');
                if ( json[dayYMD] === undefined ) {
                    json[dayYMD] = {};
                    json[dayYMD]["_complete"] = 0;
                }
                $.each(calObj.questions, function() {
                    if ( json[dayYMD][this.variable] == "" ) 
                        blanks.push(`${dayYMD}_${this.variable}`);
                    if ( unique.includes(`${dayYMD}_${this.variable}`) || 
                         (isEmpty(json[dayYMD][this.variable]) && rangeObj.exclude.includes(this.variable)) )
                        return;
                    unique.push(`${dayYMD}_${this.variable}`);
                    json[dayYMD][this.variable] = json[dayYMD][this.variable] || "";
                    events.push({
                        index: this.index,
                        date: dayYMD,
                        question: this.text,
                        type: this.type,
                        variable: this.variable
                    });
                });
            }
        });
        
        // Check if some values were in range at one point but no longer are. Remove them.
        $.each( blanks.filter(x => !unique.includes(x)), function() {
            let date = this.split('_')[0];
            let name = this.split('_').slice(1).join('_');
            delete json[date][name];
        });
        
        events.sort((a,b) => ( b.index < a.index ) ? 1 : -1); // Sort by question index for consistent display
        calQuestions.json[calName] = json;
        
        // Init the CLNDR
        let $calendar = $(`#${calName}Calendar`);
        $calendar.clndr({
            template: calQuestions.html.template,
            events: events,
            forceSixRows: true,
            clickEvents: {
                click: function(target) {
                    $calendar.find(".today").removeClass('today');
                    $(target.element).addClass('today');
                    calQuestions.fn.showDateQuestions(calName, target.date);
                },
                onMonthChange: function() {
                    calQuestions.fn.loadCalendarJSON(calName);
                }
            },
            doneRendering: function() {
                calQuestions.fn.showDateQuestions(calName, moment());
                calQuestions.fn.loadCalendarJSON(calName);
                calQuestions.fn.setupSaving(calName);
                calQuestions.fn.setupValidation(calName);
            }
        });
        
        //Loop to load the Mark all buttons
        setTimeout( function() {
            $.each( calObj['buttons'], function() {
                calQuestions.fn.insertMarkAllButton(calName, this.variable, this.value, this.text, this.tooltip);
            })
        }, 100);
        
    });
});