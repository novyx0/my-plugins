(function () {
    'use strict';

    // 1. Конфигурация и скрытый плейлист
    // URL жестко вшит в замыкание, пользователь его не видит и не может изменить
    var playlist_config = {
        id: 'ua_embedded_premium',
        name: 'IPTV Premium',
        url: 'https://tva.org.ua/ip/sam/ua.m3u', // Твоя скрытая ссылка
        active: true
    };

    // 2. Утилиты для очистки названий (из оригинального iptv.js)
    var Utils = {
        clearChannelName: function (name) {
            return name.replace(/ hd$| нd$| .hd$| .нd$/gi, '')
                       .replace(/ sd$/gi, '')
                       .replace(/ hd | нd | .hd | .нd /gi, ' ')
                       .replace(/ sd /gi, ' ')
                       .trim();
        }
    };

    // 3. Парсер M3U (Локальный, без внешних API)
    var Parser = {
        run: function (text) {
            var lines = text.split('\n');
            var channels = [];
            var currentGroup = 'Інше';

            lines.forEach(function (line) {
                line = line.trim();
                if (line.startsWith('#EXTINF:')) {
                    var info = line;
                    var groupMatch = info.match(/group-title="([^"]+)"/i);
                    var logoMatch = info.match(/tvg-logo="([^"]+)"/i);
                    var nameParts = info.split(',');
                    var name = nameParts.length > 1 ? nameParts[nameParts.length - 1].trim() : 'Channel';

                    currentGroup = groupMatch ? groupMatch[1] : (currentGroup || 'Інше');
                    
                    channels.push({
                        name: Utils.clearChannelName(name),
                        original_name: name,
                        group: currentGroup,
                        logo: logoMatch ? logoMatch[1] : '',
                        url: '' // Будет заполнено следующей строкой
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

    // 4. Основной компонент (Интерфейс)
    function Component(object) {
        var comp = new Lampa.InteractionMain(object);
        var scroll;
        var channels_data = [];

        comp.create = function () {
            var _this = this;
            this.activity.loader = true;
            
            // Загрузка плейлиста напрямую
            var xhr = new XMLHttpRequest();
            xhr.open('GET', playlist_config.url, true);
            xhr.onload = function () {
                if (xhr.status === 200) {
                    channels_data = Parser.run(xhr.responseText);
                    _this.build();
                } else {
                    Lampa.Noty.show('Ошибка загрузки плейлиста');
                    _this.activity.loader = false;
                    Lampa.Controller.toggle('content');
                }
            };
            xhr.onerror = function() {
                Lampa.Noty.show('Ошибка сети');
                _this.activity.loader = false;
                Lampa.Controller.toggle('content');
            };
            xhr.send();
            return this.render();
        };

        comp.build = function () {
            var _this = this;
            this.activity.loader = false;
            
            // Сбор уникальных групп
            var groups = ['Всі'];
            channels_data.forEach(function(c) {
                if(c.group && groups.indexOf(c.group) === -1) groups.push(c.group);
            });

            // Создаем HTML вручную, имитируя оригинальный двухпанельный интерфейс
            var html = $(`
                <div class="iptv-container">
                    <div class="iptv-menu layer--wheight">
                        <div class="iptv-menu__scroll"></div>
                    </div>
                    <div class="iptv-content layer--wheight">
                        <div class="iptv-content__scroll"></div>
                    </div>
                </div>
            `);
            
            // Рендер левого меню (Группы)
            var menu_scroll = html.find('.iptv-menu__scroll');
            groups.forEach(function(group) {
                var item = $('<div class="iptv-menu__item selector" data-group="'+group+'">'+group+'</div>');
                item.on('hover:enter', function() {
                    _this.setGroup(group, html.find('.iptv-content__scroll'));
                });
                menu_scroll.append(item);
            });

            // Инициализация скроллов
            scroll = new Lampa.Scroll({ mask: html.find('.iptv-content'), over: true, step: 200 });
            var menu_scroll_wrapper = new Lampa.Scroll({ mask: html.find('.iptv-menu'), over: true });

            this.activity.html.append(html);
            menu_scroll_wrapper.init();

            // Выбираем первую группу по умолчанию
            this.setGroup('Всі', html.find('.iptv-content__scroll'));
            
            // Настройка контроллера (пульт)
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(html);
                    Lampa.Controller.mode('content');
                },
                left: function () {
                    if (Lampa.Controller.collectionSet(html.find('.iptv-menu'))) {
                        Lampa.Controller.mode('menu');
                    }
                },
                right: function () {
                    if (Lampa.Controller.collectionSet(html.find('.iptv-content'))) {
                        Lampa.Controller.mode('content');
                    }
                },
                up: function () {
                    if (Lampa.Controller.mode() === 'content') {
                        if(!Lampa.Controller.up(html.find('.iptv-content'))) Lampa.Controller.toggle('menu');
                    } else {
                        Lampa.Controller.up(html.find('.iptv-menu'));
                    }
                },
                down: function () {
                    if (Lampa.Controller.mode() === 'content') {
                        Lampa.Controller.down(html.find('.iptv-content'));
                    } else {
                        Lampa.Controller.down(html.find('.iptv-menu'));
                    }
                },
                back: function () {
                    Lampa.Activity.back();
                }
            });
            
            Lampa.Controller.toggle('content');
        };

        comp.setGroup = function(group, container) {
            container.empty();
            
            var list = channels_data.filter(function(c) {
                return group === 'Всі' || c.group === group;
            });

            list.forEach(function(channel) {
                // Рендер элемента списка (Стиль Original Interface)
                var logo = channel.logo ? '<img src="'+channel.logo+'" loading="lazy" />' : '<span>'+channel.name.slice(0,2)+'</span>';
                var item = $(`
                    <div class="iptv-channel selector">
                        <div class="iptv-channel__ico">${logo}</div>
                        <div class="iptv-channel__body">
                            <div class="iptv-channel__title">${channel.name}</div>
                            <div class="iptv-channel__epg">ТВ-программа недоступна (Local Mode)</div>
                        </div>
                    </div>
                `);
                
                item.on('hover:enter', function() {
                    var video = {
                        url: channel.url,
                        title: channel.name,
                        author: 'IPTV Premium',
                        source: 'iptv'
                    };
                    Lampa.Player.play(video);
                    
                    // Создаем плейлист для плеера
                    var playlist = list.map(function(c){
                        return { url: c.url, title: c.name, author: 'IPTV Premium' };
                    });
                    Lampa.Player.playlist(playlist);
                });
                container.append(item);
            });
            
            scroll.init();
        };

        comp.render = function () {
            return this.activity.html;
        };
    }

    // 5. Регистрация плагина
    Lampa.Plugins.add('custom_iptv_premium', function () {
        Lampa.Component.add('custom_iptv', Component);
        
        // Добавляем иконку на главный экран или в меню
        Lampa.Settings.main().push({
            title: playlist_config.name,
            component: 'custom_iptv',
            icon: 'tv',
            description: 'Локальный премиум плейлист'
        });
    });

    // 6. Стили (CSS) - Мимикрия под оригинальный интерфейс
    var style = document.createElement('style');
    style.innerHTML = `
        .iptv-container { display: flex; height: 100%; background-color: #1b1b1b; }
        .iptv-menu { width: 280px; background: rgba(0,0,0,0.3); display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.05); }
        .iptv-content { flex-grow: 1; padding: 20px; background: transparent; }
        
        .iptv-menu__item { padding: 14px 20px; color: #aaa; font-size: 1.1em; transition: all 0.2s; border-left: 4px solid transparent; }
        .iptv-menu__item.focus { background: rgba(255,255,255,0.1); color: #fff; border-left-color: #fff; }
        
        .iptv-channel { display: flex; align-items: center; padding: 12px; margin-bottom: 8px; border-radius: 6px; background: rgba(255,255,255,0.03); transition: transform 0.2s; }
        .iptv-channel.focus { background: #fff; color: #000; transform: scale(1.01); box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
        .iptv-channel__ico { width: 45px; height: 45px; background: #333; border-radius: 4px; overflow: hidden; display: flex; justify-content: center; align-items: center; margin-right: 15px; flex-shrink: 0; }
        .iptv-channel__ico img { width: 100%; height: 100%; object-fit: contain; }
        .iptv-channel__ico span { color: #fff; font-weight: bold; font-size: 1.2em; }
        .iptv-channel.focus .iptv-channel__ico span { color: #000; }
        
        .iptv-channel__body { flex-grow: 1; overflow: hidden; }
        .iptv-channel__title { font-size: 1.3em; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .iptv-channel__epg { font-size: 0.9em; opacity: 0.6; margin-top: 4px; }
        .iptv-channel.focus .iptv-channel__epg { opacity: 0.8; color: #444; }
    `;
    document.head.appendChild(style);

})();
