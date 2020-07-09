calendarQuestions.html = {};
calendarQuestions.html.row = `
<td class="labelrc col-12" colspan="3">
<div class="clndr" id="CALNAME"></div>
</td>
`;

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
        <% if(event.type == "text") { %> 
        <textarea rows="1" class="event-item-input-text" data-variable="<%= event.variable %>"></textarea>
        <% } %>
        <% if(event.type == "yesno") { %> 
        <input name="<%= event.variable %>-radio" class="event-item-input-yesno" type="radio" data-variable="<%= event.variable %>" value="1"><span class="event-item-input-label">Yes</span>
        <input name="<%= event.variable %>-radio" class="event-item-input-yesno" type="radio" data-variable="<%= event.variable %>" value="0"><span class="event-item-input-label">No</span>
        <% } %>
      </div>
    <% }); %>
</div>
`

calendarQuestions.css = `
<style>
    .clndr {
      width: 100%;
      background-color: #ebebeb;
      font-weight: 700;
      -moz-box-shadow: 0px 4px 0 #343434;
      -webkit-box-shadow: 0px 4px 0 #343434;
      box-shadow: 0px 4px 0 #343434;
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
      border-bottom: 2px solid #3883a3;
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
</style>
`;

// Todo: Color underlining (green, red, yellow?)
// Todo: All None/Zero/No/Yes button(s)?
// Todo: Tabbing between days

function showDateQuestions(calendar, date) {
    $('.event-item').hide();
    $(`.event-item[data-date=${date}]`).show();
}

function clearCalendarData(calendar) {
    $(`textarea[name=${calendar}]`).val('{}');
}

$(document).ready(function () {
    calendarQuestions.json = {};
    window['moment-range'].extendMoment(moment);
    $('head').append(calendarQuestions.css);
    $.each( calendarQuestions.config, function(varName, calObj) {
        
        // Prep the area for the calendar
        if ( $(`[name=${varName}]`).length == 0) 
            return;
        $(`#${varName}-tr td`).hide()
        $(`#${varName}-tr`).append(calendarQuestions.html.row.replace('CALNAME',`${varName}Calendar`));
        
        // Load JSON from the text area
        let json = $(`textarea[name=${varName}]`).val();
        if ( !isEmpty(json) )
            json = JSON.parse(json);
        else
            json = {}; 
        
        // Build out the JSON with any new range info we might have
        if ( !isEmpty(calObj.range) ) {
            $.each(calObj.range, function() {
                for (let day of moment.range(this.start,this.end).by('days')) {
                    if ( isEmpty(json[day.format('YYYY-MM-DD')]) ) {
                        json[day.format('YYYY-MM-DD')] = {};
                        $.each(calObj.questions, function() {
                            json[day.format('YYYY-MM-DD')][this.variable] = {};
                            json[day.format('YYYY-MM-DD')][this.variable]['text'] = this.text;
                            json[day.format('YYYY-MM-DD')][this.variable]['type'] = this.type;
                            json[day.format('YYYY-MM-DD')][this.variable]['value'] = "";
                        });
                        json[day.format('YYYY-MM-DD')]["_complete"] = 0;
                    }
                }
            });
        } else {
            //No ranges are defined. Nothing to do.
        }
        calendarQuestions.json[varName] = json;
        
        // Transform the JSON to an Event array for CLNDR
        events = [];
        $.each( json, function(date,vars) {
            $.each( vars, function(varName, data) {
                if( varName[0] == "_" )
                    return;
                events.push( {
                    date: date,
                    question: data.text,
                    type: data.type,
                    variable: varName
                });
            }); 
        });
        
        // Init the CLNDR
        let calendar = `${varName}Calendar`;
        $(`#${calendar}`).clndr({
            template: calendarQuestions.html.template,
            events: events,
            clickEvents: {
                click: function(target) {
                    $(`#${calendar} .today`).removeClass('today');
                    $(target.element).addClass('today');
                    showDateQuestions(calendar, target.date.format('YYYY-MM-DD'));
                }
            },
            doneRendering: function() {
                showDateQuestions(calendar, moment().format('YYYY-MM-DD'));
            }
        });
        
        //Load saved values from JSON to form
        $.each( json, function(date,vars) {
            $.each( vars, function(varName, data) {
                if( varName[0] == "_" )
                    return;
                if ( data.type == 'text' )
                    $(`#${calendar} .event-item[data-date=${date}] .event-item-input-text[data-variable=${varName}]`).val(data.value);
                if ( data.type == 'yesno' && !isEmpty(data.value) )
                    $(`#${calendar} .event-item[data-date=${date}] .event-item-input-yesno[value=${data.value}]`).attr('checked', 'checked')
            }); 
        });
        
        //Setup every Textarea to save back to JSON
        $(`#${calendar} .event-item-input-text`).on('change', function() {
            calendarQuestions.json[varName][$(this).parent().data('date')][$(this).data('variable')]['value'] = $(this).val();
            calendarQuestions.json[varName][$(this).parent().data('date')]['_complete'] = Object.entries(calendarQuestions.json[varName][$(this).parent().data('date')]).map(x=>x[1]['value']||true).every(x=>x) ? '1' : '0';
            $(`textarea[name=${varName}]`).val(JSON.stringify(calendarQuestions.json[varName]));
        });
        
        //Setup every yes/no radio button to save back to JSON
        $(`#${calendar} .event-item-input-yesno`).on('click', function() {
            calendarQuestions.json[varName][$(this).parent().data('date')][$(this).data('variable')]['value'] = $(this).val();
            calendarQuestions.json[varName][$(this).parent().data('date')]['_complete'] = Object.entries(calendarQuestions.json[varName][$(this).parent().data('date')]).map(x=>x[1]['value']||true).every(x=>x) ? '1' : '0';
            $(`textarea[name=${varName}]`).val(JSON.stringify(calendarQuestions.json[varName]));
        });
    });
});