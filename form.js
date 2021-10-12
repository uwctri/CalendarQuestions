calendarQuestions.html = {};
calendarQuestions.fn = {};
calendarQuestions.html.row = `
<td class="labelrc col-12" colspan="3">
<div class="clndr" id="CALNAME"></div>
</td>`;

calendarQuestions.html.template = `
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
      <div class="event-item" data-date="<%= event.date %>">
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

calendarQuestions.html.css = `
<style>
    .clndr {
      width: 100%;
      background-color: #ebebeb;
      font-weight: 700;
      -moz-box-shadow: 0px 4px 0 #343434;
      -webkit-box-shadow: 0px 4px 0 #343434;
      box-shadow: 0px 4px 0 #343434;
      position: relative;
    }
    .clndr .clndr-controls {
      padding: 14px;
      background-color: #414141;
      color: white;
      text-align: center;
    }
    .clndr .clndr-controls .clndr-previous-button {
      float: left;
      text-align: left;
      font-size: 20px;
    }
    .clndr .clndr-controls .clndr-next-button {
      float: right;
      text-align: right;
      font-size: 20px;
    }
    .clndr .clndr-controls .clndr-previous-button,
    .clndr .clndr-controls .clndr-next-button {
      width: 30px;
      cursor: pointer;
      -webkit-user-select: none;
      /* Chrome/Safari */
      -moz-user-select: none;
      /* Firefox */
      -ms-user-select: none;
      /* IE10+ */
    }
    .clndr .clndr-controls .clndr-previous-button:hover,
    .clndr .clndr-controls .clndr-next-button:hover {
      opacity: 0.5;
    }
    .clndr .clndr-grid {
      float: left;
      width: 65%;
      border-right: 2px solid white;
    }
    .clndr .clndr-grid .days-of-the-week {
      width: 100%;
      background-color: #3883a3;
    }
    .clndr .clndr-grid .days-of-the-week .header-day {
      float: left;
      width: 14.2857%;
      padding: 14px;
      text-align: center;
      color: white;
    }
    .clndr .clndr-grid .days {
      width: 100%;
    }
    .clndr .clndr-grid .days .day,
    .clndr .clndr-grid .days .empty {
      float: left;
      width: 14.2857%;
      height: 66px;
      padding: 24px 0;
      text-align: center;
      color: #4f4f4f;
      background-color: #ebebeb;
      border-bottom: 2px solid white;
      background-image: url('https://kylestetz.github.io/CLNDR/css/./triangle.svg');
      background-size: cover;
      background-position: center;
    }
    .clndr .clndr-grid .days .day.event .day-number,
    .clndr .clndr-grid .days .empty.event .day-number {
      padding-bottom: 4px;
      border-bottom: 3px solid #3883a3;
    }
    .clndr .clndr-grid .days .day.event.day-complete .day-number{
        border-bottom: 3px solid #52CC00 !important;
    }
    .clndr .clndr-grid .days .day.event.day-incomplete .day-number{
        border-bottom: 3px solid red !important;
    }
    .clndr .clndr-grid .days .day.adjacent-month .day-number,
    .clndr .clndr-grid .days .empty.adjacent-month .day-number {
      opacity: 0.3;
    }
    .clndr .clndr-grid .days .today {
      background-color: white;
      background-image: none;
    }
    .clndr .event-listing {
      float: left;
      width: 35%;
    }
    .clndr .event-listing .event-listing-title {
      padding: 14px;
      background-color: #71bbd2;
      text-align: center;
      color: white;
      letter-spacing: 1px;
    }
    .clndr .event-listing .event-item {
      padding: 14px 14px 0px 14px;
      color: #4f4f4f;
    }
    .clndr .event-listing .event-item-question {
      font-weight: 400;
    }
    .clndr .event-listing .event-item-input-text {
        width: 100%;
    }
    .clndr .event-listing .event-item-input-int {
        width: 100%;
    }
    .clndr .event-listing .event-item-input-float {
        width: 100%;
    }
    .clndr .event-listing .event-item-input-yesno {
        margin-right: 2px;
    }
    .clndr .event-listing .event-item-input-label {
        margin-right: 8px;
    }
    .clndr .clndr-controls .month {
      width: 70%;
      padding-top: 5px;
      padding-bottom: 5px;
      display: inline-block;
      text-align: center;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .clndr .markAllButton {
      position: absolute;
      top: 465px;
      right: 0px;
      margin-left: 5px;
    }
    .clndr textarea {
        height: 2em;
    }
</style>
`;

calendarQuestions.fn.clearCalendarData = function(calendar) {
    $(`textarea[name=${calendar}]`).val('{}');
}

calendarQuestions.fn.loadCalendarJSON = function(calendar) {
    $.each( calendarQuestions.json[calendar], function(date,vars) {
        $.each( vars, function(varName, value) {
            if( varName[0] == "_" )
                return;
            if ( $(`#${calendar}Calendar .event-item[data-date=${date}] *[data-variable=${varName}]`)
                 .is('.event-item-input-text, .event-item-input-int, .event-item-input-float') )
                $(`#${calendar}Calendar .event-item[data-date=${date}] *[data-variable=${varName}]`).val(value);
            else if ( !isEmpty(value) )
                $(`#${calendar}Calendar .event-item[data-date=${date}] .event-item-input-yesno[value=${value}]`).attr('checked', true);
        }); 
        calendarQuestions.fn.colorDayComplete(calendar, vars['_complete'], date);
    });
}

calendarQuestions.fn.showDateQuestions = function(calendar, date) {
    $(`#${calendar}Calendar .event-item`).hide();
    if ( !calendarQuestions.config[calendar]['noFuture'] || 
         (calendarQuestions.config[calendar]['noFuture'] && (moment().diff(date,'days') > 0) ) )
        $(`#${calendar}Calendar .event-item[data-date=${date.format('YYYY-MM-DD')}]`).show();
}

calendarQuestions.fn.jsonSaveCalendar = function(calendar, date, variable, value) {
    calendarQuestions.json[calendar][date][variable] = value;
    calendarQuestions.json[calendar][date]['_complete'] = Object.entries(calendarQuestions.json[calendar][date]).map(x=>x[1]).filter(x => x !== undefined).every(x=>x) ? '1' : '0';
    $(`textarea[name=${calendar}]`).val(JSON.stringify(calendarQuestions.json[calendar]));
}

calendarQuestions.fn.colorDayComplete = function(calendar, isComplete, date) {
    $(`#${calendar}Calendar .calendar-day-${date}`).removeClass('day-complete day-incomplete');
    if ( calendarQuestions.config[calendar]['noFuture'] && (moment().diff(moment(date,'YYYY-MM-DD'),'days') <= 0) )
        return;
    if ( isComplete == '1' )
        $(`#${calendar}Calendar .calendar-day-${date}`).addClass('day-complete');
    else
        $(`#${calendar}Calendar .calendar-day-${date}`).addClass('day-incomplete');
}

calendarQuestions.fn.calMarkAllAsValue = function(calendar, variable, value) {
    if ( $(`#${calendar}Calendar [data-variable=${variable}][value=${value}]`).length )
        $(`#${calendar}Calendar [data-variable=${variable}][value=${value}]`).filter( function() {
            return ( moment().diff(moment($(this).parent().data('date'),'YYYY-MM-DD'),'days') > 0 && $(`#${calendar}Calendar [name=$(this).attr('name')][value!=${value}]:checked`).length == 0 ) 
        }).attr('checked', true).click();
    else
        $(`#${calendar}Calendar [data-variable=${variable}]`).filter( function() {
            return ( moment().diff(moment($(this).parent().data('date'),'YYYY-MM-DD'),'days') > 0 && $(this).val() == "" )
        }).val(value).change();
}

calendarQuestions.fn.insertMarkAllButton = function(calendar, variable, value, buttonText, tooltip) {
    const template = `<button type="button" class="btn btn-dark btn-sm markAllButton" data-toggle="tooltip" title="TOOLTIP">TEXT</button>`;
    $(`#${calendar}Calendar`).append(template.replace('TEXT',buttonText).replace('TOOLTIP',tooltip));
    let target = `#${calendar}Calendar button`;
    if ( tooltip )
        $(target).last().tooltip();
    else
        $(target).last().attr('title','');
    $(target).last().on('click', function() {
        calendarQuestions.fn.calMarkAllAsValue(calendar, variable, value);
    });
    adjustCSS();
    
    function adjustCSS() {
        if ( $(target).first().css('top') )
            $(target).last().css('top',$(target).first().css('top').replace('px','')-(35*($(target).length-1)));
        setTimeout(adjustCSS, 250);
    }
}

calendarQuestions.fn.setupCalendarSaving = function(calendar) {
    //Setup every save back to JSON
    $(`#${calendar}Calendar .event-item-input-text, #${calendar}Calendar .event-item-input-float, #${calendar}Calendar .event-item-input-int`).on('change', function() {
        calendarQuestions.fn.jsonSaveCalendar(calendar, $(this).parent().data('date'), $(this).data('variable'), $(this).val());
        calendarQuestions.fn.colorDayComplete(calendar, calendarQuestions.json[calendar][$(this).parent().data('date')]['_complete'], $(this).parent().data('date'));
    });
    $(`#${calendar}Calendar .event-item-input-yesno`).on('click', function() {
        calendarQuestions.fn.jsonSaveCalendar(calendar, $(this).parent().data('date'), $(this).data('variable'), $(this).val());
        calendarQuestions.fn.colorDayComplete(calendar, calendarQuestions.json[calendar][$(this).parent().data('date')]['_complete'], $(this).parent().data('date'));
    });
}

calendarQuestions.fn.setupCalendarValidation = function(calendar) {
    //Setup validation
    $(`#${calendar}Calendar .event-item-input-int`).on("keypress keyup blur",function (event) {
        $(this).val($(this).val().replace(/[^\d].+/, ""));
        if ((event.which < 48 || event.which > 57))
            event.preventDefault();
    });
    $(`#${calendar}Calendar .event-item-input-float`).on("keypress keyup blur",function (event) {
        $(this).val($(this).val().replace(/[^0-9\.]/g,''));
        if ((event.which != 46 || $(this).val().indexOf('.') != -1) && (event.which < 48 || event.which > 57))
            event.preventDefault();
    });
}

$(document).ready(function () {
    
    // Attach event listener for moving around the calendar with keys
    document.onkeydown = function(e) {
        let YM = $("div.today").attr('class').split('calendar-day-')[1].split(' ')[0].slice(0,-2);
        let day = Number($("div.today .day-number").text());
        switch(event.key) {
            case "ArrowLeft":
                day = day - 1;
            break;
            case "ArrowUp":
                day = day - 7;
            break;
            case "ArrowRight":
                day = day + 1;
            break;
            case "ArrowDown":
                day = day + 7;
            break;
            default: return; // exit this handler for other keys
        }
        if ( $(`.calendar-day-${YM+LZ(day)}`).length ) {
            $(`.calendar-day-${YM+LZ(day)}`).click();
            e.preventDefault(); // prevent the default action (scroll / move caret)
        }
    };
    
    calendarQuestions.json = {};
    window['moment-range'].extendMoment(moment);
    $('head').append(calendarQuestions.html.css);
    $.each( calendarQuestions.config, function(calName, calObj) {
        
        // Prep the area for the calendar
        if ( $(`[name=${calName}]`).length == 0) 
            return;
        $(`#${calName}-tr td`).hide()
        $(`#${calName}-tr`).append(calendarQuestions.html.row.replace('CALNAME',`${calName}Calendar`));
        
        // Load JSON from the text area
        let json = $(`textarea[name=${calName}]`).val();
        if ( !isEmpty(json) )
            json = JSON.parse(json);
        else
            json = {}; 
        
        // Build out the JSON with any new range info we might have
        let events = [];
        let unique = [];
        let blanks = [];
        if ( !isEmpty(calObj.range) ) {
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
        } else {
            //No ranges are defined. Nothing to do.
        }
        
        // Check if some values were in range at one point but no longer are. Remove them.
        $.each( blanks.filter(x => !unique.includes(x)), function() {
            let date = this.split('_')[0];
            let name = this.split('_').slice(1).join('_');
            delete json[date][name];
        });
        
        events.sort((a,b) => ( b.index < a.index ) ? 1 : -1); // Sort by question index for consistent display
        calendarQuestions.json[calName] = json;
        
        // Init the CLNDR
        let calendar = `${calName}Calendar`;
        $(`#${calendar}`).clndr({
            template: calendarQuestions.html.template,
            events: events,
            forceSixRows: true,
            clickEvents: {
                click: function(target) {
                    $(`#${calendar} .today`).removeClass('today');
                    $(target.element).addClass('today');
                    calendarQuestions.fn.showDateQuestions(calName, target.date);
                },
                onMonthChange: function() {
                    calendarQuestions.fn.loadCalendarJSON(calName);
                }
            },
            doneRendering: function() {
                calendarQuestions.fn.showDateQuestions(calName, moment());
                calendarQuestions.fn.loadCalendarJSON(calName);
                calendarQuestions.fn.setupCalendarSaving(calName);
                calendarQuestions.fn.setupCalendarValidation(calName);
            }
        });
        
        //Loop to load the Mark all buttons
        setTimeout( function() {
            $.each( calObj['buttons'], function() {
                calendarQuestions.fn.insertMarkAllButton(calName, this.variable, this.value, this.text, this.tooltip);
            })
        }, 100);
        
    });
});