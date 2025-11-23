(function () {
    'use strict';

    // 1. Конфигурация (Скрытая ссылка)
    var config = {
        name: 'IPTV Premium',
        url: 'https://stantv.pro/test/pJxautaY.m3u',
        active: true
    };

    // 2. Утилиты для M3U (Парсер)
    var Parser = {
        run: function (text) {
            var lines = text.split('\n');
            var channels = [];
            var currentGroup = 'Общие';

            lines.forEach(function (line) {
                line = line.trim();
                if (line.startsWith('#EXTINF:')) {
                    var info = line;
                    // Парсим атрибуты
                    var groupMatch = info.match(/group-title="([^"]+)"/i);
                    var logoMatch = info.match(/tvg-logo="([^"]+)"/i);
                    var tvgIdMatch = info.match(/tvg-id="([^"]+)"/i);
                    var tvgNameMatch = info.match(/tvg-name="([^"]+)"/i);
                    
                    // Парсим имя канала
                    var nameParts = info.split(',');
                    var name = nameParts.length > 1 ? nameParts[nameParts.length - 1].trim() : 'Channel';

                    currentGroup = groupMatch ? groupMatch[1] : (currentGroup || 'Общие');
                    
                    channels.push({
                        name: name,
                        group: currentGroup,
                        logo: logoMatch ? logoMatch[1] : '',
                        tvg_id: tvgIdMatch ? tvgIdMatch[1] : (tvgNameMatch ? tvgNameMatch[1] : ''),
                        url: '' 
                    });
                } else if (line.startsWith('http') || line.startsWith('rtmp')) {
                    if (channels.length > 0 && !channels[channels.length - 1].url) {
                        channels[channels.length - 1].url = line;
                    }
                }
            });
            return channels;
        }
    };

    // 3. Основной компонент
    function Component(object) {
        var comp = new Lampa.InteractionMain(object);
        var scroll;
        var channels_data = [];
        var activeGroup = 'Все';

        comp.create = function () {
            var _this = this;
            this.activity.loader = true;
            
            var xhr = new XMLHttpRequest();
            xhr.open('GET', config.url, true);
            xhr.onload = function () {
                if (xhr.status === 200) {
                    channels_data = Parser.run(xhr.responseText);
                    _this.build();
                } else {
                    Lampa.Noty.show('Ошибка загрузки плейлиста');
                    Lampa.Controller.toggle('content');
                }
            };
            xhr.onerror = function() {
                Lampa.Noty.show('Ошибка сети');
                Lampa.Controller.toggle('content');
            };
            xhr.send();
            return this.render();
        };

        comp.build = function () {
            var _this = this;
            this.activity.loader = false;
            
            // Создаем структуру: Заголовок с кнопкой категорий и сетка контента
            var html = $(`
                <div class="iptv-layout">
                    <div class="iptv-header">
                        <div class="iptv-title">${config.name}</div>
                        <div class="iptv-filter selector">
                            <svg style="width: 1.5em; height: 1.5em; vertical-align: middle; margin-right: 0.3em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                            Категории
                        </div>
                    </div>
                    <div class="iptv-list layer--wheight">
                        <div class="iptv-list__scroll"></div>
                    </div>
                </div>
            `);

            this.html = html;
            this.scroll_body = html.find('.iptv-list__scroll');
            
            // Логика скролла
            scroll = new Lampa.Scroll({ mask: html.find('.iptv-list'), over: true, step: 250 });

            // Обработчик кнопки категорий
            html.find('.iptv-filter').on('hover:enter', function() {
                _this.showCategories();
            });

            this.activity.html.append(html);
            this.setGroup('Все');
            
            // Назначаем контроллер
            this.toggle();
        };

        comp.toggle = function() {
            Lampa.Controller.add('content', {
                toggle: () => {
                    Lampa.Controller.collectionSet(this.html);
                    Lampa.Controller.mode('content');
                },
                up: () => {
                    if(!Lampa.Controller.up(this.scroll_body)) {
                        // Если уперлись вверх списка - переходим на кнопку "Категории"
                        Lampa.Controller.collectionSet(this.html.find('.iptv-header'));
                    }
                },
                down: () => {
                    Lampa.Controller.down(this.scroll_body);
                },
                left: () => {
                    if(Lampa.Controller.mode() === 'content') Lampa.Controller.left(this.scroll_body);
                },
                right: () => {
                    if(Lampa.Controller.mode() === 'content') Lampa.Controller.right(this.scroll_body);
                },
                back: () => {
                    Lampa.Activity.back();
                }
            });
            Lampa.Controller.toggle('content');
        };

        comp.setGroup = function(group) {
            activeGroup = group;
            this.html.find('.iptv-title').text(group === 'Все' ? config.name : group);
            this.scroll_body.empty();

            var list = channels_data.filter(c => group === 'Все' || c.group === group);

            // Рендер КАРТОЧЕК (как на скрине)
            list.forEach(channel => {
                // Если логотипа нет, генерируем заглушку с названием
                var img = channel.logo ? `<img src="${channel.logo}" loading="lazy" />` : `<span>${channel.name}</span>`;
                
                var item = $(`
                    <div class="iptv-card selector">
                        <div class="iptv-card__body">
                            <div class="iptv-card__img">${img}</div>
                        </div>
                        <div class="iptv-card__footer">
                            <div class="iptv-card__title">${channel.name}</div>
                            <div class="iptv-card__epg">Нет программы</div>
                        </div>
                    </div>
                `);

                item.on('hover:enter', function() {
                    var video = { url: channel.url, title: channel.name, author: config.name, source: 'iptv' };
                    Lampa.Player.play(video);
                    var playlist = list.map(c => ({ url: c.url, title: c.name }));
                    Lampa.Player.playlist(playlist);
                });

                this.scroll_body.append(item);
            });
            
            scroll.init();
            // Возвращаем фокус на первый элемент при смене группы
            Lampa.Controller.collectionSet(this.scroll_body);
        };

        comp.showCategories = function() {
            var groups = ['Все'];
            channels_data.forEach(c => {
                if(c.group && groups.indexOf(c.group) === -1) groups.push(c.group);
            });

            var items = groups.map(g => ({
                title: g,
                selected: g === activeGroup
            }));

            Lampa.Select.show({
                title: 'Категории',
                items: items,
                onSelect: (a) => {
                    this.setGroup(a.title);
                },
                onBack: () => {
                    Lampa.Controller.toggle('content');
                }
            });
        };

        comp.render = function () {
            return this.activity.html;
        };
    }

    // 4. Регистрация
    Lampa.Plugins.add('custom_iptv_card', function () {
        Lampa.Component.add('custom_iptv_card', Component);
        Lampa.Settings.main().push({
            title: config.name,
            component: 'custom_iptv_card',
            icon: 'tv',
            description: 'Сетка каналов'
        });
    });

    // 5. CSS (Сетка карточек как на скрине)
    var style = document.createElement('style');
    style.innerHTML = `
        .iptv-layout { height: 100%; display: flex; flex-direction: column; }
        .iptv-header { padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; }
        .iptv-title { font-size: 2em; font-weight: bold; }
        .iptv-filter { padding: 10px 20px; background: rgba(255,255,255,0.1); border-radius: 50px; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; font-size: 1.2em; }
        .iptv-filter.focus { background: #fff; color: #000; transform: scale(1.1); }
        
        .iptv-list { flex-grow: 1; overflow: hidden; padding: 0 30px; }
        .iptv-list__scroll { display: flex; flex-wrap: wrap; padding-bottom: 50px; }
        
        .iptv-card { width: 180px; margin: 15px; position: relative; transition: transform 0.2s; }
        .iptv-card.focus { transform: scale(1.1); z-index: 2; }
        
        .iptv-card__body { width: 100%; aspect-ratio: 16/9; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; display: flex; justify-content: center; align-items: center; position: relative; }
        .iptv-card.focus .iptv-card__body { background: #fff; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
        
        .iptv-card__img img { max-width: 80%; max-height: 80%; object-fit: contain; }
        .iptv-card__img span { font-size: 1.5em; font-weight: bold; text-align: center; color: #aaa; padding: 10px; }
        .iptv-card.focus .iptv-card__img span { color: #000; }
        
        .iptv-card__footer { padding-top: 10px; }
        .iptv-card__title { font-size: 1.1em; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .iptv-card__epg { font-size: 0.8em; color: #aaa; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .iptv-card.focus .iptv-card__epg { color: #ccc; }
    `;
    document.head.appendChild(style);

})();
