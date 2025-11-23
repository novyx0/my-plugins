(function () {
'use strict';

const PLAYLIST_URL = 'https://tva.org.ua/ip/sam/ua.m3u';
const PREFIX = 'uaiptv';

const Utils = {
    clear: (str) => str.replace(/\&quot;/g, '"').replace(/\&\#039;/g, "'").replace(/\&amp;/g, "&").replace(/\&.+?;/g, ''),
    isHD: (name) => {
        const math = name.toLowerCase().match(' .hd$| .нd$| .hd | .нd | hd$| нd&| hd | нd ');
        return math ? math[0].trim() : '';
    },
    clearName: (name) => {
        return name.replace(/ hd$| нd$| .hd$| .нd$/gi, '').replace(/ sd$/gi, '').replace(/ hd | нd | .hd | .нd /gi, ' ').replace(/ sd /gi, ' ').trim();
    },
    numberPad: (num, size) => {
        let s = num + "";
        while (s.length < size) s = "0" + s;
        return s;
    }
};

let favorites = [];
let playlist = null;

class Favorites {
    static load() {
        return new Promise(resolve => {
            const data = Lampa.Storage.get(PREFIX + '_favorites', '[]');
            favorites = JSON.parse(data);
            resolve();
        });
    }

    static add(channel) {
        const exist = favorites.find(f => f.url == channel.url);
        if (!exist) {
            favorites.unshift(channel);
            Lampa.Storage.set(PREFIX + '_favorites', JSON.stringify(favorites));
        }
    }

    static remove(channel) {
        favorites = favorites.filter(f => f.url != channel.url);
        Lampa.Storage.set(PREFIX + '_favorites', JSON.stringify(favorites));
    }

    static isFavorite(channel) {
        return favorites.some(f => f.url == channel.url);
    }

    static list() {
        return favorites;
    }
}

class Component {
    constructor() {
        this.create();
        this.scroll = new Lampa.Scroll({mask: true, over: true});
        this.listener = Lampa.Subscribe();
        this.activity = {toggle: () => this.toggle()};
        this.back = () => Lampa.Activity.backward();
    }

    create() {
        this.html = $('<div class="iptv"></div>');
        const top = $('<div class="head"></div>');
        top.append('<div class="head__title selector">UA IPTV</div>');
        this.html.append(top);
        this.scroll.render().addClass('layer--wheight');
        this.html.append(this.scroll.render());
        this.listener.follow('toggle', () => {
            Lampa.Controller.add('content', this.activity);
            Lampa.Controller.collectionSet(this.scroll.render());
            Lampa.Controller.collectionFocus(this.last || false, this.scroll.render());
        });
        this.listener.follow('destroy', () => {
            Lampa.Controller.remove('content');
            this.html.remove();
            this.scroll.destroy();
            this.listener.destroy();
        });
    }

    toggle() {
        Lampa.Controller.collectionSet(this.scroll.render());
        Lampa.Controller.collectionFocus(this.last || false, this.scroll.render());
        Lampa.Controller.toggle('content');
    }

    empty() {
        this.scroll.clear();
        this.scroll.reset();
        this.html.find('.selector').removeClass('selector');
        const empty = $('<div class="simple-empty selector"><div>Плейлист недоступен</div></div>');
        this.scroll.append(empty);
        this.last = empty;
    }

    load() {
        Api.playlist(PLAYLIST_URL).then(data => {
            playlist = data;
            playlist.id = 'ua_main';
            playlist.name = 'UA IPTV';
            Lampa.Storage.set(PREFIX + '_playlist', JSON.stringify(playlist));
            this.render();
        }).catch(e => {
            try {
                const saved = Lampa.Storage.get(PREFIX + '_playlist', '{}');
                playlist = JSON.parse(saved);
                if (playlist.list && playlist.list.length) {
                    this.render();
                } else {
                    this.empty();
                }
            } catch(e) {
                this.empty();
            }
        });
    }

    render() {
        this.scroll.clear();
        const html = $('<div></div>');
        
        playlist.list.forEach((channel, i) => {
            const item = $(`
                <div class="full-item selector" data-index="${i}">
                    <div class="full-item__title">${Utils.clearName(channel.name)}</div>
                    <div class="full-item__poster">
                        <div class="full-item__poster--placeholder"></div>
                    </div>
                </div>
            `);
            
            if (Favorites.isFavorite(channel)) {
                item.addClass('favorite');
            }

            item.on('hover:focus', (e) => {
                this.last = item;
                if (e.type == 'focus') {
                    item.addClass('focus');
                    this.scroll.update(item, true);
                }
            }).on('hover:enter', () => {
                Lampa.Player.play(channel.url, {
                    title: Utils.clearName(channel.name)
                });
                Lampa.Player.playlist([channel]);
            }).on('hover:long', () => {
                if (Favorites.isFavorite(channel)) {
                    Favorites.remove(channel);
                    item.removeClass('favorite');
                } else {
                    Favorites.add(channel);
                    item.addClass('favorite');
                }
            });
            
            html.append(item);
        });

        this.scroll.append(html);
        this.listener.send('display', {html: this.html});
    }

    start() {
        Favorites.load().then(() => this.load());
    }
}

Lampa.Listener.follow('app', (e) => {
    if (Lampa.Activity.active().activity == 'main') {
        Lampa.Listener.send('menu', {
            title: 'UA IPTV',
            items: [{
                title: 'UA IPTV',
                html: 'UA IPTV каналы',
                navigator: {navigate: () => Lampa.Activity.push({url: '', title: 'UA IPTV', component: 'uaiptv', page: 1})}
            }],
            visible: true
        });
    }
});

Lampa.Component.add('uaiptv', Component);

Lampa.Listener.follow('app', () => {
    Favorites.load();
});

})();
