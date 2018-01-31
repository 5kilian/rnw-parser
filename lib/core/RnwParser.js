let fs = require('fs');
let pnml = require('xml2json');

function RnwParser() {

    this.readRnw = (path) => {
        return read(path, this.parseRnw);
    };

    this.readPnml = (path) => {
        return read(path, this.parsePnml);
    };

    function read(path, parse) {
        return new Promise((resolve, reject) => {
            fs.readFile(path, 'UTF-8', (err, data) => {
                (err === null) ? resolve(parse(data)) : reject(err);
            });
        });
    }

    this.parseRnw = (data) => {
        let rows = data.split('\n');

        if (parseInt(rows[0].trim()) !== 11) throw 'version not supported';

        let drawings = [];
        let ref = [];

        let useRef = false;

        for (let i=1; i<rows.length; i++) {
            ref[i-1] = parseRnwRow(rows[i]);
            if (ref[i-1].type === 'StandardDrawing') useRef = true;
            if (useRef) ref[i-1].id = i-1;
        }

        for (let i=1; i<rows.length; i++) {
            let figure = ref[i-1];
            let rank = getRank(rows[i]);

            switch (figure.type) {
                case 'StandardDrawing':
                case 'Drawing':
                    figure.type = 'RefNet';
                    figure.figures = [];
                    drawings.push(figure);
                    break;
                case 'Line':
                case 'Arc':
                case 'DoubleArc':
                case 'Elbow':
                case 'Text':
                case 'Declaration':
                case 'Place':
                case 'Transition':
                case 'VirtualPlace':
                case 'Rectangle':
                case 'Triangle':
                case 'RoundRectangle':
                case 'Ellipse':
                case 'Diamond':
                case 'PolyLine':
                case 'Polygon':
                case 'Pie':
                    for (; i+1<rows.length && rank+1 === getRank(rows[i+1]); i++) {
                        addPart(figure, parseRnwRow(rows[i+1]), ref[i+1], ref);
                    }
                    if (figure.ref !== undefined) figure.ref = ref[figure.ref].id;
                    drawings.slice(-1).pop().figures.push(figure);
            }
        }

        return drawings.length === 1 ? drawings[0] : drawings;
    };

    this.parsePnml = (xml) => {
        let data = JSON.parse(pnml.toJson(xml)).pnml;

        let figures = []
            .concat(getPlaces(data.net.place))
            .concat(getTransitions(data.net.transition))
            .concat(getArcs(data.net.arc))
            .concat(getToolSpecific(data.net.toolspecific));

        return {
            xmlns: data.xmlns,
            type: data.net.type,
            id: data.net.id,
            name: data.net.name.text,
            figures: figures,
            size: figures.length
        };
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
                figure.fill = parseColor('rgb(112,219,147)');
            }
            if (!isTextFigure(figure)) {
                figure.line = parseColor('rgb(0,0,0)');
            }
            if (rawRow[1] === '"no_attributes"') {
                skip = 1;
            } else {
                for (let i=1; i<=rawRow[3]; i++, skip += 3) {
                    let att = renameAttribute(rawRow[skip+1].replace(/"/g, ''));
                    if (att === 'align') rawRow[skip+2] = '"Alignment"';
                    switch (rawRow[skip+2]) {
                        case '"Alignment"':
                            figure[att] = parseAlignment(rawRow[skip+3]);
                            break;
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
        }

        switch (figure.type) {
            case 'StandardDrawing':
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
            case 'DoubleArc':
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
                delete figure.line;
                delete figure.fill;
                figure.text = rawRow[skip+3].replace(/"/g, '');
                figure.position = { x: parseInt(rawRow[skip+1]), y: parseInt(rawRow[skip+2]) };
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
                break;
            case 'OffsetLocator':
                figure.offset = { x: parseInt(rawRow[1]), y: parseInt(rawRow[2]) };
        }

        figure.type = figure.type.replace(/^CPN/, '');

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

    function addPart(figure, part, next, ref = []) {
        switch (part.type) {
            case 'ChopEllipseConnector':
            case 'ChopBoxConnector':
                if (figure.source === undefined) {
                    figure.source = ref[part.ref].id;
                } else {
                    figure.target = (part.ref !== undefined) ? ref[part.ref].id : next.id;
                }
                break;
            case 'DoubleArrowTip':
            case 'ArrowTip':
                if (figure.tip === undefined) figure.tip = { type: undefined, count: 0 };
                figure.tip.type = part.type;
                figure.tip.count++;
                break;
            case 'OffsetLocator':
                figure.offset = part.offset;
        }
    }

    function renameAttribute(att) {
        switch (att) {
            case 'FigureWithID': return 'id';
            case 'TextAlignment': return 'align';
            case 'FillColor': return 'fill';
            case 'FrameColor': return 'line';
            default: return att;
        }
    }

    function parseColor(color) {
        color = color.match(/rgb\((\d+)[,](\d+)[,](\d+)\)/);
        return { r: parseInt(color[1]), g: parseInt(color[2]), b: parseInt(color[3]), alpha: 255 }
    }

    function parseAlignment(align) {
        switch (align) {
            case '0': return 'left';
            case '1': return 'center';
            case '2': return 'right';
        }
    }

    function getTip(type) {
        switch (type) {
            case 'multi-both': return { type: 'DoubleArrowTip', count: 2 };
            case 'multi-ordinary': return { type: 'DoubleArrowTip', count: 1 };
            case 'both': return { type: 'ArrowTip', count: 2 };
            case 'ordinary': return { type: 'ArrowTip', count: 1 };
            case 'test': return { type: 'ArrowTip', count: 0 };
        }
    }

    function getPlaces(place) {
        return getFigures(place, 'Place')
    }

    function getTransitions(transition) {
        return getFigures(transition, 'Transition');
    }

    function getToolSpecific(toolspecific) {
        if (toolspecific !== undefined && toolspecific.VirtualPlace !== undefined) {
            return getFigures(toolspecific.VirtualPlace, 'VirtualPlace');
        }
        return [];
    }

    function getArcs(arc) {
        return getFigures(arc, 'Arc');
    }

    function getFigures(figure, type) {
        let figures = [];
        if (figure !== undefined) {
            (figure instanceof Array ? figure : [figure]).forEach(raw => {
                figure = {
                    id: parseInt(raw.id),
                    type: type,
                    line: parseColor(raw.graphics.line.color)
                };
                if (type === 'Arc') {
                    figure.source = parseInt(raw.source);
                    figure.target = parseInt(raw.target);
                    figure.LineStyle = raw.graphics.line.style;
                    figure.tip = getTip(raw.type.text);
                } else {
                    figure.position = { x: parseInt(raw.graphics.position.x), y: parseInt(raw.graphics.position.y) };
                    figure.width = parseInt(raw.graphics.dimension.x);
                    figure.height = parseInt(raw.graphics.dimension.y);
                    figure.fill = parseColor(raw.graphics.fill.color);
                }
                figures.push(figure);
                raw.textId = 0;
                if (raw.initialMarking !== undefined || raw.inscription !== undefined) {
                    let text = getText(raw, raw.inscription === undefined ? 'initialMarking' :'inscription');
                    figures.push(text);
                    figure.inscription = text.id;
                }
                if (raw.name !== undefined) {
                    figures.push(getText(raw, 'name'));
                }
            });
        }
        return figures;
    }

    function getText(raw, textType) {
        return {
            id: 't' + raw.id + raw.textId++,
            type: 'Text',
            text: raw[textType].text,
            align: 'center',
            position: { x: parseInt(raw.graphics.position.x), y: parseInt(raw.graphics.position.y) },
            offset: { x: parseInt(raw[textType].graphics.offset.x), y: parseInt(raw[textType].graphics.offset.y) },
            font: { family: 'SansSerif', style: (textType === 'name' ? 1 : 0), size: 12 },
            ref: parseInt(raw.id)
        };
    }
}

module.exports = new RnwParser();
