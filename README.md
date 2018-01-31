# rnw-parser

JavaScript parser for reference net datatypes.

Supported datatypes:
  * *.rnw *.draw .*fa
  * *.pnml

## Installation

`npm install rnw-parser`

## Example usage 

```JavaScript
import parser from 'rnw-parser';

parser.readRnw('__PathToRNW__').then(drawing => {
    console.log(drawing);
});

parser.readPnml('__PathToPNML__').then(drawing => {
    console.log(drawing);
});

```

## Licence
MIT

