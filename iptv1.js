(function () {
    'use strict';

    const PLAYLIST_URL = 'https://tva.org.ua/ip/sam/ua.m3u';
    const PREFIX = 'uaiptv';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) throw new TypeError("Cannot call a class as a function");
    }

    function _defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
        }
    }

    function _createClass(Constructor, protoProps, staticProps) {
        if (protoProps) _defineProperties(Constructor.prototype, protoProps);
        if (staticProps) _defineProperties(Constructor, staticProps);
        return Constructor;
    }

    const Utils = {
        clear(str) {
            return str.replace(/\&quot;/g, '"').replace(/\&\#039;/g, "'").replace(/\&amp;/g, "&").replace(/\&.+?;/g, '');
        },
        isHD(name) {
            const math = name.toLowerCase().match(' .hd$| .нd$| .hd | .нd | hd$| нd&| hd | нd ');
            return math ? math[0].trim() : '';
        },
        clearHDSD(name) {
            return name.replace(/ hd$| нd$| .hd$| .нd$/gi, '').replace(/ sd$/gi, '').replace(/ hd | нd | .hd | .нd /gi, ' ').replace(/ sd /gi, ' ');
        },
        clearName(name) {
            return this.clearHDSD(Utils.clear(name));
        }
    };

    let playlist = null;

    class Component {
        constructor() {
            this.create();
            this.listener = Lampa.Subscribe();
            this.scroll = new Lampa.Scroll({
                mask: true,
                over: true,
                step: 400
            });
            this.empty = () => {
                this.scroll.clear();
                this.scroll.reset();
                this.html.find('.iptv-list__text').html(Lampa.Lang.translate('iptv_playlist_empty'));
                const empty = Lampa.Template.get('uaiptv_list_empty', {});
                empty.find('.iptv-list__empty-text').html(Lampa.Lang.translate('title_empty'));
                this.scroll.append(empty);
                this.listener.send('display', this);
            };
            this.toggle = () => {
                Lampa.Controller.add('content', {
                    toggle: () => {
                        Lampa.Controller.collectionSet(scroll.render());
                        Lampa.Controller.collectionFocus(last || scroll.render().find('.selector'), scroll.render());
                    }
                });
                Lampa.Controller.toggle('content');
            };
            this.back = () => Lampa.Activity.backward();
        }

        create() {
            this.html = $('<div class="iptv-list selector"></div>');
            this.scroll.render().addClass('layer--wheight').data('mheight', 100);
            this.html.append(this.scroll.render());
            this.listener.follow('toggle', () => {
                Lampa.Controller.collectionSet(this.html);
                Lampa.Controller.collectionFocus(this.last || this.html.find('.selector'), this.html);
            });
            this.listener.follow('destroy', () => {
                this.html.remove();
                this.scroll.destroy();
                this.listener.destroy();
            });
            this.start();
        }

        start() {
            this.load();
        }

        load() {
            const _this = this;
            Api.m3u(PLAYLIST_URL).then((data) => {
                playlist = data;
                playlist.id = 'ua_main';
                playlist.name = 'UA IPTV';
                playlist.custom = true;
                Lampa.Storage.set(PREFIX + '_playlist', JSON.stringify(playlist));
                _this.render(playlist);
            }).catch(() => {
                const saved = Lampa.Storage.get(PREFIX + '_playlist', '{}');
                try {
                    playlist = JSON.parse(saved);
                    if (playlist.channels && playlist.channels.length) {
                        _this.render(playlist);
                    } else {
                        _this.empty();
                    }
                } catch (e) {
                    _this.empty();
                }
            });
        }

        render(pl) {
            const html = $('<div></div>');
            pl.channels.forEach(channel => {
                const item = Lampa.Template.get('uaiptv_channel', {channel});
                item.on('hover:enter', () => {
                    Lampa.Activity.push({
                        url: channel.url,
                        title: Utils.clearName(channel.name),
                        component: 'full',
                        player: {
                            url: channel.url,
                            timeline: 0
                        }
                    });
                });
                html.append(item);
            });
            this.scroll.clear().append(html);
            this.listener.send('display', this);
        }
    }

    Lampa.Template.add('uaiptv_list_empty', `<div class="iptv-list__empty">
        <div class="iptv-list__empty-img"></div>
        <div class="iptv-list__empty-text">Плейлист недоступен</div>
    </div>`);

    Lampa.Template.add('uaiptv_channel', ({channel}) => {
        const hd = Utils.isHD(channel.name);
        return `<div class="selector" data-type="video" data-url="${channel.url}">
            <div class="iptv-item">
                <div class="iptv-item__img" style="background-image: url('https://via.placeholder.com/360x204/333/fff?text=${Utils.clearName(channel.name).replace(/\\s+/g,' ')}')"></div>
                <div class="iptv-item__title">${Utils.clearName(channel.name)}${hd ? ' ' + hd : ''}</div>
            </div>
        </div>`;
    });

    Lampa.Listener.follow('app', () => {
        if (Lampa.Manifest.plugins && Lampa.Manifest.plugins.includes('iptv')) {
            Lampa.Listener.send('playlist', {
                title: 'UA IPTV',
                url: PLAYLIST_URL,
                component: Component,
                page: 1
            });
        }
    });

})();
