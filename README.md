# Calendar Questions - Redcap External Module

## What does it do?

Calendar Questions allows you to capture simple (text, int, yes/no, float) questions in a nice-looking calendar format where questions are repeated for every day within a range or ranges. This data is stored as JSON in a redcap text area (notes) field.

## Installing

This EM isn't yet available to install via redcap's EM database so you'll need to install to your modules folder (i.e. `redcap/modules/\calendarQuestionsv1.0.0`) manually.

## Configuration

Configuration consists of defining questions, their types, and text (straight forward) followed by ranges (event/feild) that the questions should be asked for. 

## Call Outs

* The code base has not had extensive review and needs to be refactored