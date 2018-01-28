# rnw-parser

JavaScript parser for reference net datatypes

## Installation

`npm install rnw-parser`

## Example usage 

```JavaScript
import parser from 'rnw-parser';

parser.readRnw('__PathToRNW__').then(drawings => {
    console.log(drawings[0]);
});

```

## Licence
MIT

