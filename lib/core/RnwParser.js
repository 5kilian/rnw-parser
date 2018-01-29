let fs = require('fs');
let pnml = require('xml2json');

function RnwParser() {

    this.readRnw = (path) => {
        return new Promise((resolve, reject) => {
            fs.readFile(path, 'UTF-8', (err, data) => {
                (err === null) ? resolve(this.parseRnw(data)) : reject(err);
            });
        });
    };

    this.readPnml = (path) => {
        return new Promise((resolve, reject) => {
            fs.readFile(path, 'UTF-8', (err, data) => {
                (err === null) ? resolve(this.parsePnml(data)) : reject(err);
            });
        });
    };

    this.parseRnw = (data) => {
        let rows = data.split('\n');

        if (parseInt(rows[0].trim()) !== 11) throw 'version not supported';

        let drawings = [];
        let ref = [];

        for (let i=1; i<rows.length; i++) ref[i-1] = parseRnwRow(rows[i]);

        for (let i=1; i<rows.length; i++) {
            let figure = ref[i-1];
            let rank = getRank(rows[i]);

            switch (figure.type) {
                case 'CPNDrawing':
                    figure.figures = [];
                    drawings.push(figure);
                    break;
                case 'LineConnection':
                case 'ArcConnection':
                case 'DoubleArcConnection':
                case 'ElbowConnection':
                    while (i+1<rows.length && rank+1 === getRank(rows[i+1])) {
                        let part = parseRnwRow(rows[i+1]);
                        switch (part.type) {
                            case 'ChopEllipseConnector':
                            case 'ChopBoxConnector':
                                if (figure.start === undefined) {
                                    figure.start = ref[part.ref].id;
                                } else {
                                    figure.end = (part.ref !== undefined) ? ref[part.ref].id : ref[i+1].id;
                                }
                                break;
                            case 'DoubleArrowTip':
                            case 'ArrowTip':
                                if (figure.tip === undefined) figure.tip = { type: undefined, count: 0 };
                                figure.tip.type = part.type;
                                figure.tip.count++;
                        }
                        i++;
                    }
                    drawings.slice(-1).pop().figures.push(figure);
                    break;
                case 'VirtualPlaceFigure':
                    figure.ref = ref[figure.ref].id;
                    drawings.slice(-1).pop().figures.push(figure);
                    break;
                case 'PlaceFigure':
                case 'TransitionFigure':
                case 'RectangleFigure':
                case 'TriangleFigure':
                case 'RoundRectangleFigure':
                case 'EllipseFigure':
                case 'DiamondFigure':
                case 'LineFigure':
                case 'PolyLineFigure':
                case 'PolygonFigure':
                case 'TextFigure':
                case 'CPNTextFigure':
                    drawings.slice(-1).pop().figures.push(figure);
            }
        }

        return drawings.length === 1 ? drawings[0] : drawings;
    };

    this.parsePnml = (xml) => {
        let data = JSON.parse(pnml.toJson(xml));

        data.size = 1;

        return data;
    };

    function getRank(rawRow) {
        return rawRow.match(/^(\s+)/)[1].length / 4
    }

    function parseRnwRow(rawRow) {
        rawRow = rawRow.trim().match(/(?:[^\s"]+|"[^"]*")+/g).filter(element => element.length > 0);
        let figure = {};

        figure.type = rawRow[0].split('.').slice(-1).pop();

        let skip = 3;

        if (isAttributeFigure(figure)) {
            for (let i=1; i<=rawRow[3]; i++, skip += 3) {
                let att = renameAttribute(rawRow[skip+1].replace(/"/g, ''));
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
            case 'CPNDrawing':
                figure.size = parseInt(rawRow[1]);
                break;
            case 'TriangleFigure':
                addStandardFigureAttributes(figure, rawRow.slice(skip));
                figure.form = parseInt(rawRow[skip+5]);
                break;
            case 'PlaceFigure':
            case 'RectangleFigure':
            case 'EllipseFigure':
            case 'TransitionFigure':
            case 'DiamondFigure':
                addStandardFigureAttributes(figure, rawRow.slice(skip));
                break;
            case 'VirtualPlaceFigure':
                addStandardFigureAttributes(figure, rawRow.slice(skip));
                figure.ref = parseInt(rawRow[skip+7]);
                break;
            case 'PieFigure':
                addStandardFigureAttributes(figure, rawRow.slice(skip));
                figure.source = parseFloat(rawRow[skip+5]);
                figure.target = parseFloat(rawRow[skip+6]);
                break;
            case 'RoundRectangleFigure':
                addStandardFigureAttributes(figure, rawRow.slice(skip));
                figure.a = parseInt(rawRow[skip+5]);
                figure.b = parseInt(rawRow[skip+6]);
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
            case 'CPNTextFigure':
                figure.position = { x: parseInt(rawRow[skip+1]), y: parseInt(rawRow[skip+2]) };
                figure.text = rawRow[skip+3].replace(/"/g, '');
                figure.font = {
                    family: rawRow[skip+4].replace(/"/g, ''),
                    style: parseInt(rawRow[skip+5]),
                    size: parseInt(rawRow[skip+6])
                };
                break;
            case 'ChopBoxConnector':
            case 'ChopEllipseConnector':
                if (rawRow.length > 2 && rawRow[1] === 'REF') figure.ref = parseInt(rawRow[2]);
        }

        return figure;
    }

    function isAttributeFigure(figure) {
        switch (figure.type) {
            case 'PlaceFigure':
            case 'TransitionFigure':
            case 'ArcConnection':
            case 'LineConnection':
            case 'DoubleArcConnection':
            case 'ElbowConnection':
            case 'VirtualPlaceFigure':
            case 'RectangleFigure':
            case 'TriangleFigure':
            case 'RoundRectangleFigure':
            case 'EllipseFigure':
            case 'DiamondFigure':
            case 'LineFigure':
            case 'PieFigure':
            case 'PolyLineFigure':
            case 'PolygonFigure':
            case 'TextFigure':
            case 'CPNTextFigure':
                return true;
        }
        return false;
    }

    function addStandardFigureAttributes(figure, rawRow) {
        figure.position = { x: parseInt(rawRow[1]), y: parseInt(rawRow[2]) };
        figure.width = parseInt(rawRow[3]);
        figure.height = parseInt(rawRow[4]);
    }

    function renameAttribute(att) {
        switch (att) {
            case 'FigureWithID': return 'id';
            default: return att;
        }
    }
}

module.exports = new RnwParser();
