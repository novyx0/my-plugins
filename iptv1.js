(function () {
  'use strict';

  var Utils = /*#__PURE__*/function () {
    function Utils() {
      _classCallCheck(this, Utils);
    }

    _createClass(Utils, null, [{
      key: "clear",
      value: function clear(str) {
        return str.replace(/\&quot;/g, '"').replace(/\&\#039;/g, "'").replace(/\&amp;/g, "&").replace(/\&.+?;/g, '');
      }
    }, {
      key: "isHD",
      value: function isHD(name) {
        var math = name.toLowerCase().match(' .hd$| .нd$| .hd | .нd | hd$| нd&| hd | нd ');
        return math ? math[0].trim() : '';
      }
    }, {
      key: "clearHDSD",
      value: function clearHDSD(name) {
        return name.replace(/ hd$| нd$| .hd$| .нd$/gi, '').replace(/ sd$/gi, '').replace(/ hd | нd | .hd | .нd /gi, ' ').replace(/ sd /gi, ' ');
      }
    }, {
      key: "clearMenuName",
      value: function clearMenuName(name) {
        return name.replace(/^\d+\. /gi, '').replace(/^\d+ /gi, '');
      }
    }, {
      key: "clearChannelName",
      value: function clearChannelName(name) {
        return this.clearHDSD(this.clear(name));
      }
    }, {
      key: "hasArchive",
      value: function hasArchive(channel) {
        if (channel.catchup) {
          var days = parseInt(channel.catchup.days);
          if (!isNaN(days) && days > 0) return days;
        }
        return 0;
      }
    }, {
      key: "canUseDB",
      value: function canUseDB() {
        return DB.db && Lampa.Storage.get('iptv_use_db', 'storage') == 'storage';
      }
    }]);

    return Utils;
  }();

  var favorites = [];

  var Favorites = /*#__PURE__*/function () {
    function Favorites() {
      _classCallCheck(this, Favorites);
    }

    _createClass(Favorites, null, [{
      key: "load",
      value: function load() {
        var _this = this;

        return new Promise(function (resolve, reject) {
          if (Utils.canUseDB()) {
            DB.getData('favorites').then(function (result) {
              favorites = result || [];
            })["finally"](resolve);
          } else {
            _this.nosuport();
            resolve();
          }
        });
      }
    }, {
      key: "nosuport",
      value: function nosuport() {
        favorites = Lampa.Storage.get('iptv_favorite_channels', '[]');
      }
    }, {
      key: "list",
      value: function list() {
        return favorites;
      }
    }, {
      key: "key",
      value: function key() {
        return Lampa.Storage.get('iptv_favotite_save', 'url');
      }
    }, {
      key: "find",
      value: function find(favorite) {
        var _this2 = this;

        return favorites.find(function (a) {
          return a[_this2.key()] == favorite[_this2.key()];
        });
      }
    }, {
      key: "remove",
      value: function remove(favorite) {
        var _this3 = this;

        return new Promise(function (resolve, reject) {
          var find = favorites.find(function (a) {
            return a[_this3.key()] == favorite[_this3.key()];
          });

          if (find) {
            if (Utils.canUseDB()) {
              DB.deleteData('favorites', favorite[_this3.key()]).then(function () {
                Lampa.Arrays.remove(favorites, find);
                resolve();
              })["catch"](reject);
            } else {
              Lampa.Arrays.remove(favorites, find);
              Lampa.Storage.set('iptv_favorite_channels', favorites);
              resolve();
            }
          } else reject();
        });
      }
    }, {
      key: "add",
      value: function add(favorite) {
        var _this4 = this;

        return new Promise(function (resolve, reject) {
          if (!favorites.find(function (a) {
            return a[_this4.key()] == favorite[_this4.key()];
          })) {
            Lampa.Arrays.extend(favorite, {
              view: 0,
              added: Date.now()
            });

            if (Utils.canUseDB()) {
              DB.addData('favorites', favorite[_this4.key()], favorite).then(function () {
                favorites.push(favorite);
                resolve();
              })["catch"](reject);
            } else {
              favorites.push(favorite);
              Lampa.Storage.set('iptv_favorite_channels', favorites);
              resolve();
            }
          } else reject();
        });
      }
    }, {
      key: "update",
      value: function update(favorite) {
        var _this5 = this;

        return new Promise(function (resolve, reject) {
          if (favorites.find(function (a) {
            return a[_this5.key()] == favorite[_this5.key()];
          })) {
            Lampa.Arrays.extend(favorite, {
              view: 0,
              added: Date.now()
            });
            if (Utils.canUseDB()) DB.updateData('favorites', favorite[_this5.key()], favorite).then(resolve)["catch"](reject);else {
              Lampa.Storage.set('iptv_favorite_channels', favorites);
              resolve();
            }
          } else reject();
        });
      }
    }, {
      key: "toggle",
      value: function toggle(favorite) {
        return this.find(favorite) ? this.remove(favorite) : this.add(favorite);
      }
    }]);

    return Favorites;
  }();

  var locked = [];

  var Locked = /*#__PURE__*/function () {
    function Locked() {
      _classCallCheck(this, Locked);
    }]);

    return Locked;
  }();

  var Component = /*#__PURE__*/function () {
    function Component() {
      _classCallCheck(this, Component);

      this.create();
      this.listener = Lampa.Subscribe();
      this.scroll = new Lampa.Scroll({
        mask: true,
        over: true,
        step: 400
      });
      this.empty = function () {
        this.scroll.clear();
        this.scroll.reset();
        this.html.find('.iptv-list__text').html(Lampa.Lang.translate('iptv_playlist_empty'));
        var empty = Lampa.Template.get('iptv_list_empty', {});
        empty.find('.iptv-list__empty-text').html(Lampa.Lang.translate('title_empty'));
        this.scroll.append(empty);
        this.listener.send('display', this);
      };

      this.toggle = function () {
        var _this4 = this;

        Lampa.Controller.add('content', {
          toggle: function toggle() {
            Lampa.Controller.collectionSet(_this4.scroll.render());
            Lampa.Controller.collectionFocus(_this4.last || _this4.scroll.render().find('.selector'), _this4.scroll.render());
          }
        });
        Lampa.Controller.toggle('content');
      };

      this.back = function () {
        Lampa.Activity.backward();
      };

      this.start();
    }

    _createClass(Component, [{
      key: "create",
      value: function create() {
        var _this5 = this;

        this.html = $('<div class="iptv-list selector"></div>');
        this.scroll.render().addClass('layer--wheight').data('mheight', 100);
        this.html.append(this.scroll.render());
        this.listener.follow('toggle', function () {
          Lampa.Controller.collectionSet(_this5.html);
          Lampa.Controller.collectionFocus(_this5.last || _this5.html.find('.selector'), _this5.html);
        });
        this.listener.follow('destroy', function () {
          _this5.html.remove();
          _this5.scroll.destroy();
          _this5.listener.destroy();
        });
      }
    }, {
      key: "start",
      value: function start() {
        var _this6 = this;

        this.activity.loader(true);
        Favorites.load().then(function () {
          var active = Lampa.Storage.get('iptv_pilotbook', 'playlist');
          var playlist = null;

          if (active == 'playlist') {
            var find = this3.listplaylist.find(function (l) {
              return l.id == active;
            });

            if (find) {
              _this6.listener.send('channels-load', find);
            } else {
              _this6.listplaylist();
            }
          } else {
            _this6.listplaylist();
          }
        });
      }
    }, {
      key: "load",
      value: function load(playlist) {
        var _this7 = this;

        Api.playlist('https://tva.org.ua/ip/sam/ua.m3u').then(function (find) {
          playlist = find;
          playlist.id = 'ua_main';
          playlist.name = 'UA IPTV';
          playlist.custom = true;
          Lampa.Storage.set('iptv_playlist', JSON.stringify(playlist));
          _this7.listener.send('channels-load', playlist);
        })["catch"](function () {
          _this7.empty();
        });
      }
    }]);

    return Component;
  }();

  var Pilotbook = /*#__PURE__*/function () {
    function Pilotbook() {
      _classCallCheck(this, Pilotbook);
    }

    _createClass(Pilotbook, null, [{
      key: "toggle",
      value: function toggle(params) {
        var pilot = Lampa.Storage.get('iptv_pilotbook', 'playlist');

        if (pilot == params.what) {
          return;
        }

        Lampa.Storage.set('iptv_pilotbook', params.what);

        if (params.what == 'playlist') {
          Component.listener.send('list-playlist');
        } else {
          Component.listener.send('list-' + params.what);
        }
      }
    }]);

    return Pilotbook;
  }();

  Lampa.Template.add('iptv_list_empty', "<div class=\"iptv-list__empty\">\n        <div class=\"iptv-list__empty-img\"></div>\n        <div class=\"iptv-list__empty-text\">{{translate title_empty}}</div>\n    </div>");

  Lampa.Template.add('iptv_channel', function (params) {
    var channel = params.channel;
    var favorite = Favorites.find(channel);
    var locked = Locked.find(channel);
    var hd = Utils.isHD(channel.name);
    var name = Utils.clearChannelName(channel.name);
    var days = Utils.hasArchive(channel);

    var html = $('<div class="selector" data-type="video" data-url="' + channel.url + '"></div>');
    var item = $('<div class="iptv-item"></div>');
    var img = $('<div class="iptv-item__img"></div>');

    html.append(item.append(img).append('<div class="iptv-item__title">' + name + (hd ? ' ' + hd : '') + '</div>'));

    if (days) {
      html.append('<div class="iptv-item__archive">' + Lampa.Lang.translate('archive_title') + ' (' + days + ' ' + Lampa.Lang.translate('day_short' + (days > 1 ? 's' : '')) + ')</div>');
    }

    if (favorite) {
      html.append('<div class="iptv-item__icon ico_favorite"></div>');
    }

    if (locked) {
      html.append('<div class="iptv-item__icon ico_locked"></div>');
    }

    html.on('hover:enter', function () {
      Lampa.Activity.push({
        url: channel.url,
        title: name,
        component: 'full',
        player: {
          url: channel.url,
          timeline: 0
        },
        archive: days
      });
    }).on('hover:long', function () {
      Favorites.toggle(channel).then(function () {
        html.find('.ico_favorite').toggleClass('active');
      });
    });

    return html;
  });

  Lampa.Listener.follow('app', function (e) {
    if (Lampa.Activity.active().activity == 'main') {
      var playlists = Lampa.Storage.get('iptv_playlists', '[]');
      playlists = JSON.parse(playlists);

      Lampa.Listener.send('menu', {
        title: 'IPTV',
        items: [{
          title: 'playlist',
          html: '📺 Плейлисты',
          count: playlists.length,
          navigator: {
            navigate: function navigate() {
              Lampa.Activity.push({
                url: '',
                title: 'Плейлисты',
                component: 'iptv',
                page: 1,
                pilot: 'playlist'
              });
            }
          }
        }],
        visible: true
      });
    }
  });

  Lampa.Component.add('iptv', Component);
  Lampa.Listener.follow('app', function () {
    Favorites.load();
    Locked.load();
  });
})();
