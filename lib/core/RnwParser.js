let fs = require('fs');

function RnwParser() {

    this.readRnw = (path) => {
        return new Promise((resolve, reject) => {
            fs.readFile(path, 'UTF-8', (err, data) => {
                (err === null) ? resolve(this.parseRnw(data)) : reject(err);
            });
        });
    };

    this.parseRnw = (data) => {
        let rows = data.split('\n');

        if (parseInt(rows[0].trim()) !== 11) throw 'version not supported';

        let drawings = [];

        for (let i=1; i<rows.length; i++) {
            let rank = rows[i].match(/^(\s+)/)[1].length / 4;
            let rawRow = rows[i].trim().split(' ');
            let figure = this.parseRnwRow(rawRow);
            figure.rank = rank;

            switch (figure.type) {
                case 'CPNDrawing':
                    figure.size = parseInt(rawRow.slice(-1).pop());
                    figure.figures = [];
                    drawings.push(figure);
                    break;
                case 'PlaceFigure':
                case 'TransitionFigure':
                case 'ArcConnection':
                    drawings.slice(-1).pop().figures.push(figure);
            }
        }

        return drawings;
    };

    this.parseRnwRow = (rawRow) => {
        rawRow = rawRow.filter(element => element.length > 0);
        let figure = {};

        figure.type = rawRow[0].split('.').slice(-1).pop();

        switch (figure.type) {
            case 'PlaceFigure':
            case 'TransitionFigure':
            case 'ArcConnection':
                for (let i=1; i<=rawRow[3]; i++) {
                    let att = rawRow[i*3+1].replace(/"/g, '');
                    switch (rawRow[i*3+2]) {
                        case '"Int"':
                            figure[att] = parseInt(rawRow[i*3+3]);
                            break;
                        default:
                            figure[att] = rawRow[i*3+3];
                    }
                }
                figure.x = parseInt(rawRow[3+rawRow[3]*3+1]);
                figure.y = parseInt(rawRow[3+rawRow[3]*3+2]);
                figure.width = parseInt(rawRow[3+rawRow[3]*3+3]);
                figure.height = parseInt(rawRow[3+rawRow[3]*3+4]);
                break;
        }

        return figure;
    };
}

module.exports = new RnwParser();
