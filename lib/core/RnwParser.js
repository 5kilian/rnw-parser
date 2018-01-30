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
                case 'Line':
                case 'Arc':
                case 'DoubleArc':
                case 'Elbow':
                    while (i+1<rows.length && rank+1 === getRank(rows[i+1])) {
                        let part = parseRnwRow(rows[i+1]);
                        switch (part.type) {
                            case 'ChopEllipseConnector':
                            case 'ChopBoxConnector':
                                if (figure.source === undefined) {
                                    figure.source = ref[part.ref].id;
                                } else {
                                    figure.target = (part.ref !== undefined) ? ref[part.ref].id : ref[i+1].id;
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
                case 'VirtualPlace':
                case 'Text':
                case 'CPNText':
                case 'Declaration':
                    if (figure.ref !== undefined) figure.ref = ref[figure.ref].id;
                    drawings.slice(-1).pop().figures.push(figure);
                    break;
                case 'Place':
                case 'Transition':
                case 'Rectangle':
                case 'Triangle':
                case 'RoundRectangle':
                case 'Ellipse':
                case 'Diamond':
                case 'PolyLine':
                case 'Polygon':
                case 'Pie':
                    drawings.slice(-1).pop().figures.push(figure);
            }
        }

        return drawings.length === 1 ? drawings[0] : drawings;
    };

    this.parsePnml = (xml) => {
        let data = JSON.parse(pnml.toJson(xml)).pnml;
        data.size = -1;
        
        let drawing = {
            xmlns: data.xmlns,
            type: data.net.type,
            id: data.net.id,
            name: data.net.name.text,
            figures: []
        };

        if (data.net.place !== undefined) {
            if (!(data.net.place instanceof Array)) data.net.place = [data.net.place];
            data.net.place.forEach(place => {
                drawing.figures.push({
                    id: parseInt(place.id),
                    type: 'Place',
                    position: { x: parseInt(place.graphics.position.x), y: parseInt(place.graphics.position.y) },
                    width: parseInt(place.graphics.dimension.x),
                    height: parseInt(place.graphics.dimension.y),
                    FillColor: parseColor(place.graphics.fill.color),
                    FrameColor: parseColor(place.graphics.line.color)
                });
            })
        }
        if (data.net.transition !== undefined) {
            if (!(data.net.transition instanceof Array)) data.net.transition = [data.net.transition];
            data.net.transition.forEach(transition => {
                drawing.figures.push({
                    id: parseInt(transition.id),
                    type: 'Transition',
                    position: { x: parseInt(transition.graphics.position.x), y: parseInt(transition.graphics.position.y) },
                    width: parseInt(transition.graphics.dimension.x),
                    height: parseInt(transition.graphics.dimension.y),
                    FillColor: parseColor(transition.graphics.fill.color),
                    FrameColor: parseColor(transition.graphics.line.color)
                });
            })
        }
        if (data.net.arc !== undefined) {
            if (!(data.net.arc instanceof Array)) data.net.arc = [data.net.arc];
            data.net.arc.forEach(arc => {
                drawing.figures.push({
                    id: parseInt(arc.id),
                    type: 'Arc',
                    source: parseInt(arc.source),
                    target: parseInt(arc.target),
                    FrameColor: parseColor(arc.graphics.line.color),
                    LineStyle: arc.graphics.line.style,
                    tip: getTip(arc.type.text)
                });
            })
        }
        if (data.net.toolspecific !== undefined && data.net.toolspecific.VirtualPlace !== undefined) {
            if (!(data.net.toolspecific.VirtualPlace instanceof Array)) {
                data.net.toolspecific.VirtualPlace = [data.net.toolspecific.VirtualPlace];
            }
            data.net.toolspecific.VirtualPlace.forEach(virtual => {
                drawing.figures.push({
                    id: parseInt(virtual.id),
                    type: 'VirtualPlace',
                    position: { x: parseInt(virtual.graphics.position.x), y: parseInt(virtual.graphics.position.y) },
                    width: parseInt(virtual.graphics.dimension.x),
                    height: parseInt(virtual.graphics.dimension.y),
                    FillColor: parseColor(virtual.graphics.fill.color),
                    FrameColor: parseColor(virtual.graphics.line.color)
                });
            })
        }

        drawing.size = drawing.figures.length;

        return drawing;
    };

    function getRank(rawRow) {
        return rawRow.match(/^(\s+)/)[1].length / 4;
    }

    function parseRnwRow(rawRow) {
        rawRow = rawRow.trim().match(/(?:[^\s"]+|"[^"]*")+/g).filter(element => element.length > 0);
        let figure = { id: 0 };

        figure.type = rawRow[0].split('.').slice(-1).pop().replace(/Figure$|Connection$/, '');

        let skip = 3;

        if (isAttributeFigure(figure)) {
            if (isFillableFigure(figure)) {
                figure.FillColor = parseColor('rgb(112,219,147)');
            }
            if (!isTextFigure(figure)) {
                figure.FrameColor = parseColor('rgb(0,0,0)');
            }
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
            case 'Triangle':
                addStandardFigureAttributes(figure, rawRow.slice(skip));
                figure.form = parseInt(rawRow[skip+5]);
                break;
            case 'Place':
            case 'Rectangle':
            case 'Ellipse':
            case 'Transition':
            case 'Diamond':
                addStandardFigureAttributes(figure, rawRow.slice(skip));
                break;
            case 'VirtualPlace':
                addStandardFigureAttributes(figure, rawRow.slice(skip));
                figure.ref = parseInt(rawRow[skip+7]);
                break;
            case 'Pie':
                addStandardFigureAttributes(figure, rawRow.slice(skip));
                figure.start = parseFloat(rawRow[skip+5]);
                figure.end = parseFloat(rawRow[skip+6]);
                break;
            case 'RoundRectangle':
                addStandardFigureAttributes(figure, rawRow.slice(skip));
                figure.a = parseInt(rawRow[skip+5]);
                figure.b = parseInt(rawRow[skip+6]);
                break;
            case 'Arc':
            case 'Line':
            case 'Elbow':
            case 'PolyLine':
            case 'Polygon':
                figure.positions = [];
                for (let i=1; i<=rawRow[skip+1]; i++) {
                    figure.positions.push({ x: parseInt(rawRow[skip+i*2]), y: parseInt(rawRow[skip+i*2+1])});
                }
                break;
            case 'Text':
            case 'CPNText':
            case 'Declaration':
                figure.position = { x: parseInt(rawRow[skip+1]), y: parseInt(rawRow[skip+2]) };
                figure.text = rawRow[skip+3].replace(/"/g, '');
                figure.font = {
                    family: rawRow[skip+4].replace(/"/g, ''),
                    style: parseInt(rawRow[skip+5]),
                    size: parseInt(rawRow[skip+6])
                };
                if (rawRow[skip+8] === 'REF') {
                    figure.ref = parseInt(rawRow[skip+9]);
                }
                break;
            case 'ChopBoxConnector':
            case 'ChopEllipseConnector':
                if (rawRow.length > 2 && rawRow[1] === 'REF') figure.ref = parseInt(rawRow[2]);
        }

        return figure;
    }

    function isAttributeFigure(figure) {
        switch (figure.type) {
            case 'Place':
            case 'Transition':
            case 'Arc':
            case 'Line':
            case 'DoubleArc':
            case 'Elbow':
            case 'VirtualPlace':
            case 'Rectangle':
            case 'Triangle':
            case 'RoundRectangle':
            case 'Ellipse':
            case 'Diamond':
            case 'Pie':
            case 'PolyLine':
            case 'Polygon':
            case 'Text':
            case 'CPNText':
            case 'Declaration':
                return true;
        }
        return false;
    }

    function isFillableFigure(figure) {
        switch (figure.type) {
            case 'Place':
            case 'Transition':
            case 'VirtualPlace':
            case 'Rectangle':
            case 'Triangle':
            case 'RoundRectangle':
            case 'Ellipse':
            case 'Diamond':
            case 'Pie':
            case 'Polygon':
                return true;
        }
        return false;
    }

    function isTextFigure(figure) {
        switch (figure.type) {
            case 'Text':
            case 'CPNText':
            case 'Declaration':
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

    function parseColor(color) {
        color = color.match(/rgb\((\d+)[,](\d+)[,](\d+)\)/);
        return { r: parseInt(color[1]), g: parseInt(color[2]), b: parseInt(color[3]), alpha: 255 }
    }

    function getTip(type) {
        switch (type) {
            case 'multi-ordinary': return { type: 'DoubleArrowTip', count: 1 };
            case 'both': return { type: 'ArrowTip', count: 2 };
            case 'ordinary': return { type: 'ArrowTip', count: 1 };
            case 'test': return { type: 'ArrowTip', count: 0 };
        }
    }
}

module.exports = new RnwParser();
