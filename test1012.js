(function() {
    'use strict';

    // Основний об'єкт плагіна
    var lampa_ui_layout = {
        name: 'lampa_ui_layout',
        version: '1.0.0',
        settings: {}
    };

    /**
     * Автоматично приховує мітку "TV" (функція, яку просили залишити)
     */
    function autoTranslateTVLabels() {
        var tv_translate_style = "<style id=\"lampa_ui_tv_translate\">\n" +
            ".card__type { display: none !important; }\n" +
            ".card--tv .card__type { display: none !important; }\n" +
            ".card__type::after { display: none !important; }\n" +
            "</style>\n";
        $('#lampa_ui_tv_translate').remove();
        $('body').append(tv_translate_style);
    }

    /**
     * Ініціалізує плагін
     */
    function initializePlugin() {
        // applyUniversalStyles(); // Видалено: більше не змінюємо дизайн карток
        autoTranslateTVLabels();
    }

    // Очікування завантаження додатку та ініціалізація плагіна
    if (window.appready) {
        initializePlugin();
    } else {
        Lampa.Listener.follow('app', function(event) {
            if (event.type === 'ready') {
                initializePlugin();
            }
        });
    }

    // Реєстрація плагіна
    Lampa.Manifest.plugins = {
        name: 'lampa_ui_layout',
        version: '1.0.0',
        description: 'Мінімалістичний інтерфейс (Тільки TV Labels)'
    };

    window.lampa_ui_layout = lampa_ui_layout;
})();
