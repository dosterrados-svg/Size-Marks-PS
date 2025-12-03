// Size Marks HEIGHT ONLY (CM) - CONFIGURABLE
#target photoshop

// =========================================================================
//                             НАСТРОЙКИ (CONFIG)
// =========================================================================
var CONFIG = {
    // --- ВНЕШНИЙ ВИД ---
    lineSize:      3,           // Толщина белых линий
    strokeSize:    2,           // Толщина черной обводки
    halfMark:      6,           // Размер засечек
    
    // --- ТЕКСТ ---
    fontSize:      24,          // Размер шрифта
    fontName:      "ArialMT",   // Имя шрифта
    textMargin:    10,          // Отступ текста от линии (вправо)
    
    // --- ЕДИНИЦЫ ---
    unitText:      " cm",       // Текст единиц
    conversion:    2.54,        // Коэффициент (2.54 для см)
    decimals:      2,           // Знаков после запятой

    // --- ЦВЕТА ---
    textColor:     [255, 255, 255], // Белый
    strokeColor:   [0, 0, 0]        // Черный
};
// =========================================================================
//                     ДАЛЕЕ ИДЕТ КОД
// =========================================================================

function setScaleF(ratio) { return function(val) { return val / ratio; }; }

function formatValueWithUnits(val, unit, space) {
    if (!space) space = "";
    return "" + val + space + unit;
}

function makePoint(coords, scaleFunc) {
    var newCoords = [];
    for (var i = 0; i < coords.length; i++) {
        newCoords[i] = scaleFunc(coords[i]);
    }
    var p = new PathPointInfo();
    p.anchor = newCoords;
    p.leftDirection = newCoords;
    p.rightDirection = newCoords;
    p.kind = PointKind.CORNERPOINT;
    return p;
}

function drawLine(startXY, endXY, doc, scaleFunc) {
    var p1 = makePoint(startXY, scaleFunc);
    var p2 = makePoint(endXY, scaleFunc);
    var lineSubPath = new SubPathInfo();
    lineSubPath.closed = false;
    lineSubPath.operation = ShapeOperation.SHAPEXOR;
    lineSubPath.entireSubPath = [p1, p2];
    var linePathItem = doc.pathItems.add("Line", [lineSubPath]);
    linePathItem.strokePath(ToolType.PENCIL);
    linePathItem.remove();
}

function pickTool(toolName) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(stringIDToTypeID(toolName));
    desc.putReference(charIDToTypeID("null"), ref);
    executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);
}

function setPenToolSize(size) {
    var desc1 = new ActionDescriptor();
    var ref1 = new ActionReference();
    ref1.putClass(charIDToTypeID("PcTl")); 
    desc1.putReference(charIDToTypeID("null"), ref1);
    executeAction(charIDToTypeID("slct"), desc1, DialogModes.NO);
    var desc2 = new ActionDescriptor();
    var ref2 = new ActionReference();
    ref2.putEnumerated(charIDToTypeID("Brsh"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    desc2.putReference(charIDToTypeID("null"), ref2);
    var desc3 = new ActionDescriptor();
    desc3.putUnitDouble(stringIDToTypeID("masterDiameter"), charIDToTypeID("#Pxl"), size);
    desc2.putObject(charIDToTypeID("T   "), charIDToTypeID("Brsh"), desc3);
    executeAction(charIDToTypeID("setd"), desc2, DialogModes.NO);
}

function applyPixelStroke(doc, size, colorRgb) {
    try {
        var idsetd = charIDToTypeID( "setd" );
        var desc = new ActionDescriptor();
        var ref = new ActionReference();
        ref.putProperty( charIDToTypeID( "Chnl" ), charIDToTypeID( "fsel" ) );
        desc.putReference( charIDToTypeID( "null" ), ref );
        var ref2 = new ActionReference();
        ref2.putEnumerated( charIDToTypeID( "Chnl" ), charIDToTypeID( "Chnl" ), charIDToTypeID( "Trsp" ) );
        desc.putReference( charIDToTypeID( "T   " ), ref2 );
        executeAction( idsetd, desc, DialogModes.NO );

        var sColor = new SolidColor();
        sColor.rgb.red = colorRgb[0];
        sColor.rgb.green = colorRgb[1];
        sColor.rgb.blue = colorRgb[2];

        doc.selection.stroke(sColor, size, StrokeLocation.OUTSIDE, ColorBlendMode.NORMAL, 100, false);
        doc.selection.deselect();
    } catch(e) {}
}

// --- ОСНОВНАЯ ЛОГИКА ---
var doc = null;
var docIsExist = false;
var selBounds = null;
var selIsExist = false;

var store = {
    activeLayer: null,
    rulerUnits: app.preferences.rulerUnits,
    typeUnits: app.preferences.typeUnits,
    originalColor: app.foregroundColor 
};

app.preferences.rulerUnits = Units.PIXELS;
app.preferences.typeUnits = TypeUnits.POINTS;

try {
    doc = app.activeDocument;
    docIsExist = true;
} catch(e) { alert("Нет открытого документа"); }

if (docIsExist) {
    try {
        selBounds = doc.selection.bounds;
        selIsExist = true;
    } catch(e) { alert("Сначала сделайте выделение"); }
}

if (docIsExist && selIsExist) {
    var mainColor = new SolidColor();
    mainColor.rgb.red = CONFIG.textColor[0];
    mainColor.rgb.green = CONFIG.textColor[1];
    mainColor.rgb.blue = CONFIG.textColor[2];
    app.foregroundColor = mainColor;

    var docRes = doc.resolution;
    var baseRes = 72;
    var scaleRatio = docRes / baseRes;
    var scaleFunc = setScaleF(scaleRatio);
    var charThinSpace = "\u200a";

    var selX1 = selBounds[0].value;
    var selY1 = selBounds[1].value;
    var selX2 = selBounds[2].value;
    var selY2 = selBounds[3].value;

    var selHeight = selY2 - selY1;
    var val = ((selHeight / docRes) * CONFIG.conversion).toFixed(CONFIG.decimals);

    // Центр текста (для высоты - слева/справа от линии)
    var txtPosX = selX1 + CONFIG.textMargin;
    var txtPosY = selY1 + (selHeight / 2);

    store.activeLayer = doc.activeLayer;
    doc.selection.deselect();

    var markLayer = doc.artLayers.add();
    markLayer.name = "LinesTemp";
    setPenToolSize(CONFIG.lineSize);

    // Вертикальные линии
    drawLine([selX1, selY1], [selX1, selY2], doc, scaleFunc);
    drawLine([selX1 - CONFIG.halfMark, selY1], [selX1 + CONFIG.halfMark, selY1], doc, scaleFunc);
    drawLine([selX1 - CONFIG.halfMark, selY2], [selX1 + CONFIG.halfMark, selY2], doc, scaleFunc);

    var txtLayer = doc.artLayers.add();
    txtLayer.kind = LayerKind.TEXT;
    var txtItem = txtLayer.textItem;
    
    txtItem.font = CONFIG.fontName;
    txtItem.size = new UnitValue(CONFIG.fontSize, "pt");
    txtItem.autoKerning = AutoKernType.OPTICAL;
    txtItem.justification = Justification.LEFT;
    txtItem.position = [txtPosX, txtPosY];
    txtItem.color = mainColor;

    txtItem.contents = formatValueWithUnits(val, CONFIG.unitText, charThinSpace);

    var finishLayer = txtLayer.merge();
    finishLayer.name = "H " + val;
    finishLayer.opacity = 100;

    doc.activeLayer = finishLayer;

    applyPixelStroke(doc, CONFIG.strokeSize, CONFIG.strokeColor);

    finishLayer.move(store.activeLayer, ElementPlacement.PLACEBEFORE);

    doc.selection.select([
        [selX1, selY1],
        [selX2, selY1],
        [selX2, selY2],
        [selX1, selY2]
    ]);

    app.preferences.rulerUnits = store.rulerUnits;
    app.preferences.typeUnits = store.typeUnits;
    app.foregroundColor = store.originalColor;

    pickTool("marqueeRectTool");
}