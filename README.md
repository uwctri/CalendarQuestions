# Calendar Questions - Redcap External Module

## What does it do?

Calendar Questions allows you to capture simple  questions in a nice-looking calendar format where questions are repeated for every day within a range or ranges. This data is stored as JSON in a redcap text area (notes) field.

## Installing

You can install the module from the REDCap EM repo or drop it directly in your modules folder (i.e. `redcap/modules/calendarQuestionsv1.0.0`).

## Configuration

Configuration consists of three major areas:

* Questions - Conists of question text, type (text, int, yes/no, float, checkbox) a unique variable name, optional branching logic.
    * Branching Logic - Similar to other areas of redcap, you can define a static event/field combo and some value. Only when this expression evaluates to true will the question be shown. Piping is not respected by the text value. You can use "!" as the first character of the text to signify "not equal".
    * Replace Questions - Useful for more advanced calendar behavior where you may have a new question replace an older one. 
* Ranges - Define two date feilds that act as the start and end of your question range. You can exclude some questions from ranges if you'd like by listing the variables you assoicated with them. Offsets can also be used, or left blank, if the date fields need to be adjusted for any reason. If you'd like to have a fixed length range you can set start and end to the same values and then define an offset of the range size.
* Mark All Buttons - Set button text, a variable, and a static value. The button will show in the lower right corner of the calendar on any day where the appropriate question is shown. Clicking the button will set all non-complete days to the defined value for the given question for the current month.

## Call Outs

* The calendar is not responsive and looks bad on smaller screens.
* Technical - All dates passed in JS are currently YMD strings, this should be switched the moment objects in a future release
* Adding too many Mark-all buttons will clutter the screen and look bad.