// Size Marks WIDTH ONLY (CM) - CONFIGURABLE
#target photoshop

// =========================================================================
//                             НАСТРОЙКИ (CONFIG)
//             Меняйте значения ниже, чтобы настроить вид выносок
// =========================================================================
var CONFIG = {
    // --- ВНЕШНИЙ ВИД ЛИНИЙ ---
    lineSize:      3,    // Толщина белых линий (в пикселях)
    strokeSize:    2,    // Толщина черной обводки вокруг всего (в пикселях)
    halfMark:      6,    // Длина "засечек" на концах (половина длины черточки)
    
    // --- ТЕКСТ ---
    fontSize:      24,          // Размер шрифта (в пунктах, pt)
    fontName:      "ArialMT",   // Имя шрифта (нужно именно PostScript имя, например "Arial-BoldMT" или "TimesNewRomanPSMT")
    textMargin:    10,          // Отступ текста от линии (в пикселях)
    
    // --- ЕДИНИЦЫ ИЗМЕРЕНИЯ ---
    unitText:      " cm",       // Что писать после цифры (например: " mm", " cm", " px")
    conversion:    2.54,        // Коэффициент пересчета. 
                                // Если документ 72dpi: 2.54 = см, 25.4 = мм. 
                                // Если нужно в пикселях, поставьте 1 и уберите деление на разрешение в коде.
    decimals:      2,           // Сколько знаков после запятой (2 -> 10.55, 1 -> 10.5, 0 -> 11)

    // --- ЦВЕТА (RGB: 0-255) ---
    textColor:     [255, 255, 255], // Цвет текста и линий (сейчас Белый)
    strokeColor:   [0, 0, 0]        // Цвет обводки (сейчас Черный)
};
// =========================================================================
//                     ДАЛЕЕ ИДЕТ КОД (ЛУЧШЕ НЕ МЕНЯТЬ)
// =========================================================================

// Вспомогательная функция масштабирования
function setScaleF(ratio) { return function(val) { return val / ratio; }; }

// Форматирование текста (добавление единиц измерения)
function formatValueWithUnits(val, unit, space) {
    if (!space) space = "";
    return "" + val + space + unit;
}

// Создание точки пути (для рисования линий)
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

// Функция рисования линии
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

// Выбор инструмента
function pickTool(toolName) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(stringIDToTypeID(toolName));
    desc.putReference(charIDToTypeID("null"), ref);
    executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);
}

// Настройка размера карандаша (для толщины линии)
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

// Функция применения обводки (Edit > Stroke)
function applyPixelStroke(doc, size, colorRgb) {
    try {
        // Загрузка выделения (Load Selection from Transparency)
        var idsetd = charIDToTypeID( "setd" );
        var desc = new ActionDescriptor();
        var ref = new ActionReference();
        ref.putProperty( charIDToTypeID( "Chnl" ), charIDToTypeID( "fsel" ) );
        desc.putReference( charIDToTypeID( "null" ), ref );
        var ref2 = new ActionReference();
        ref2.putEnumerated( charIDToTypeID( "Chnl" ), charIDToTypeID( "Chnl" ), charIDToTypeID( "Trsp" ) );
        desc.putReference( charIDToTypeID( "T   " ), ref2 );
        executeAction( idsetd, desc, DialogModes.NO );

        // Настройка цвета обводки
        var sColor = new SolidColor();
        sColor.rgb.red = colorRgb[0];
        sColor.rgb.green = colorRgb[1];
        sColor.rgb.blue = colorRgb[2];

        // Применение обводки
        doc.selection.stroke(sColor, size, StrokeLocation.OUTSIDE, ColorBlendMode.NORMAL, 100, false);
        doc.selection.deselect();
    } catch(e) {}
}

// --- ОСНОВНАЯ ЛОГИКА ---
var doc = null;
var docIsExist = false;
var selBounds = null;
var selIsExist = false;

// Сохраняем текущие настройки пользователя
var store = {
    activeLayer: null,
    rulerUnits: app.preferences.rulerUnits,
    typeUnits: app.preferences.typeUnits,
    originalColor: app.foregroundColor 
};

// Временно переключаем единицы в пиксели для расчетов
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
    // Устанавливаем цвет текста (из CONFIG)
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

    // Координаты выделения
    var selX1 = selBounds[0].value;
    var selY1 = selBounds[1].value;
    var selX2 = selBounds[2].value;
    var selY2 = selBounds[3].value;

    var selWidth = selX2 - selX1;
    // Расчет значения (Ширина / Разрешение * Коэффициент)
    var val = ((selWidth / docRes) * CONFIG.conversion).toFixed(CONFIG.decimals);

    var txtPosX = selX1 + (selWidth / 2);
    var txtPosY = selY1 - CONFIG.textMargin;

    store.activeLayer = doc.activeLayer;
    doc.selection.deselect();

    // Слой для линий
    var markLayer = doc.artLayers.add();
    markLayer.name = "LinesTemp";
    setPenToolSize(CONFIG.lineSize);

    // Рисуем
    drawLine([selX1, selY1], [selX2, selY1], doc, scaleFunc);
    drawLine([selX1, selY1 - CONFIG.halfMark], [selX1, selY1 + CONFIG.halfMark], doc, scaleFunc);
    drawLine([selX2, selY1 - CONFIG.halfMark], [selX2, selY1 + CONFIG.halfMark], doc, scaleFunc);

    // Слой для текста
    var txtLayer = doc.artLayers.add();
    txtLayer.kind = LayerKind.TEXT;
    var txtItem = txtLayer.textItem;
    
    txtItem.font = CONFIG.fontName;
    txtItem.size = new UnitValue(CONFIG.fontSize, "pt");
    txtItem.autoKerning = AutoKernType.OPTICAL;
    txtItem.justification = Justification.CENTER;
    txtItem.position = [txtPosX, txtPosY];
    txtItem.color = mainColor;

    txtItem.contents = formatValueWithUnits(val, CONFIG.unitText, charThinSpace);

    // Объединение слоев
    var finishLayer = txtLayer.merge();
    finishLayer.name = "W " + val;
    finishLayer.opacity = 100;

    doc.activeLayer = finishLayer;

    // Применение обводки
    applyPixelStroke(doc, CONFIG.strokeSize, CONFIG.strokeColor);

    finishLayer.move(store.activeLayer, ElementPlacement.PLACEBEFORE);

    // Восстановление выделения
    doc.selection.select([
        [selX1, selY1],
        [selX2, selY1],
        [selX2, selY2],
        [selX1, selY2]
    ]);

    // Возврат настроек пользователя
    app.preferences.rulerUnits = store.rulerUnits;
    app.preferences.typeUnits = store.typeUnits;
    app.foregroundColor = store.originalColor;

    pickTool("marqueeRectTool");
}