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
                case 'VirtualPlaceFigure':
                case 'PlaceFigure':
                case 'TransitionFigure':
                case 'ArcConnection':
                case 'RectangleFigure':
                case 'RoundRectangleFigure':
                case 'EllipseFigure':
                case 'DiamondFigure':
                case 'LineFigure':
                case 'ElbowConnection':
                case 'PolyLineFigure':
                case 'PolygonFigure':
                    drawings.slice(-1).pop().figures.push(figure);
            }
        }

        return drawings.length === 1 ? drawings[0] : drawings;
    };

    this.parseRnwRow = (rawRow) => {
        rawRow = rawRow.filter(element => element.length > 0);
        let figure = {};

        figure.type = rawRow[0].split('.').slice(-1).pop();

        let skip = 3;

        switch (figure.type) {
            case 'PlaceFigure':
            case 'TransitionFigure':
            case 'ArcConnection':
            case 'VirtualPlaceFigure':
            case 'RectangleFigure':
            case 'RoundRectangleFigure':
            case 'EllipseFigure':
            case 'DiamondFigure':
            case 'LineFigure':
            case 'ElbowConnection':
            case 'PieFigure':
            case 'PolyLineFigure':
            case 'PolygonFigure':
            case 'TextFigure':
                for (let i=1; i<=rawRow[3]; i++, skip += 3) {
                    let att = rawRow[skip+1].replace(/"/g, '');
                    switch (rawRow[skip+2]) {
                        case '"Color"':
                            figure[att] = {
                                r: parseInt(rawRow[skip+3]),
                                g: parseInt(rawRow[skip+4]),
                                b: parseInt(rawRow[skip+5]),
                                alpha: parseInt(rawRow[skip+6]),
                            };
                            i++;
                            skip += 3;
                            rawRow[3]++;
                            break;
                        case '"Int"':
                            figure[att] = parseInt(rawRow[skip+3]);
                            break;
                        case '"Float"':
                            figure[att] = parseFloat(rawRow[skip+3]);
                            break;
                        case '"String"':
                            figure[att] = rawRow[skip+3].replace(/"/g, '');
                            break;
                        default:
                            figure[att] = rawRow[skip+3];
                    }
                }
        }

        switch (figure.type) {
            case 'PlaceFigure':
            case 'TransitionFigure':
            case 'VirtualPlaceFigure':
            case 'RectangleFigure':
            case 'EllipseFigure':
            case 'DiamondFigure':
                figure.position = { x: parseInt(rawRow[skip+1]), y: parseInt(rawRow[skip+2]) };
                figure.width = parseInt(rawRow[skip+3]);
                figure.height = parseInt(rawRow[skip+4]);
                break;
            case 'PieFigure':
                figure.position = { x: parseInt(rawRow[skip+1]), y: parseInt(rawRow[skip+2]) };
                figure.width = parseInt(rawRow[skip+3]);
                figure.height = parseInt(rawRow[skip+4]);
                figure.start = parseFloat(rawRow[skip+5]);
                figure.end = parseFloat(rawRow[skip+6]);
                break;
            case 'RoundRectangleFigure':
                figure.a = parseInt(rawRow[skip+5]);
                figure.b = parseInt(rawRow[skip+6]);
                figure.position = { x: parseInt(rawRow[skip+1]), y: parseInt(rawRow[skip+2]) };
                figure.width = parseInt(rawRow[skip+3]);
                figure.height = parseInt(rawRow[skip+4]);
                break;
            case 'ArcConnection':
            case 'LineFigure':
            case 'ElbowConnection':
            case 'PolyLineFigure':
            case 'PolygonFigure':
                figure.positions = [];
                for (let i=1; i<=rawRow[skip+1]; i++) {
                    figure.positions.push({ x: parseInt(rawRow[skip+i*2]), y: parseInt(rawRow[skip+i*2+1])});
                }
                break;
            case 'TextFigure':
                figure.position = { x: parseInt(rawRow[skip+1]), y: parseInt(rawRow[skip+2]) };
                figure.text = rawRow[skip+3].replace(/"/g, '');
                figure.font = rawRow[skip+4].replace(/"/g, '');
                figure.fontsize = parseInt(rawRow[skip+6]);
        }

        return figure;
    };
}

module.exports = new RnwParser();
