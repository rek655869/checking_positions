// ==UserScript==
// @name         Должности в чате
// @version      1.0.1
// @author       rek655
// @license      MIT
// @match        https://catwar.su/cw3/
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @updateURL https://openuserjs.org/meta/rek655869/Должности_в_чате.meta.js
// @downloadURL https://openuserjs.org/install/rek655869/Должности_в_чате.user.js
// ==/UserScript==

(function (window, document, $) {
  'use strict';

  if (typeof $ === 'undefined') return;

  function getPosition(playerId) {
    return new Promise((resolve, reject) => {
      $.ajax({
        beforeSend: function (xhr) {
          xhr.setRequestHeader('X-Requested-With', {
            toString: function () {
              return '';
            }
          });
        },
        url: '/cat' + playerId,
        type: 'GET',
        datatype: "html",
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Upgrade-Insecure-Requests': 1
        },
        success: function (data) {
          data = data.replace(/<img[^>]*>/gi, "");
          let tempDiv = $(data);
          let element = tempDiv.find(`p[data-cat="${playerId}"]`);
          let position = element.find('i');
          if (position) {
            if (position.first().text() != "(вы находитесь в одном месте)") {
              resolve(position.first().text());
            }
          }

        },
        error: function (error) {
          console.error('Ошибка:', error);
          reject(error);
        }
      });
    });
  }

  function setPosition(href, nickElem) {
    let id = href.split('/cat')[1];

    getPosition(id).then(position => {
      if (position) {
        $("<i> (" + position + ")</i>").insertAfter(nickElem);
      }
    }).catch(error => {
      console.error('Ошибка:', error);
    });
  }

  $(document).ready(setTimeout(function () {
    if ($('#cws_chat_msg').length) {
      // ДЛЯ CWShed
      // проставление должек в уже написанных соо
      $('.cws_chat_wrapper').each(function () {
        let href = $(this).find('.cws_chat_report a').attr('href');
        let nickElem = $(this).find('.cws_chat_msg .nick')
        setPosition(href, nickElem);
      });

      // кто-то написал соо
      // Создание нового MutationObserver для #cws_chat_msg
      const cwsObserver = new MutationObserver(function (mutationsList) {
        mutationsList.forEach(function (mutation) {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeName === 'DIV') {
              $(node).each(function () {
                let href = $(this).find('.cws_chat_report a').attr('href');
                let nickElem = $(this).find('.cws_chat_msg .nick');
                setPosition(href, nickElem);
              });
            }
          });
        });
      });

      // Настройки и запуск наблюдателя
      const cwsConfig = {
        childList: true,
        subtree: true
      };
      const cwsChatMsgElement = document.getElementById('cws_chat_msg');
      if (cwsChatMsgElement) {
        cwsObserver.observe(cwsChatMsgElement, cwsConfig);
      }
    }
    else {
      // проставление должек в уже написанных соо
      $('.chat_text').each(function () {
        let href = $(this).closest('tr').children('td:eq(1)').find('a').attr('href');
        let nickElem = $(this).find('.nick');
        setPosition(href, nickElem);
      });

      // кто-то написал соо
      // Создание нового MutationObserver для #chat_msg
      const chatObserver = new MutationObserver(function (mutationsList) {
        mutationsList.forEach(function (mutation) {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeName === 'SPAN') {
              $(node).find('.chat_text').each(function () {
                let href = $(this).closest('tr').children('td:eq(1)').find('a').attr('href');
                let nickElem = $(this).find('.nick');
                setPosition(href, nickElem);
              });
            }
          });
        });
      });

      // Настройки и запуск наблюдателя
      const chatConfig = {
        childList: true,
        subtree: true
      };
      const chatMsgElement = document.getElementById('chat_msg');
      if (chatMsgElement) {
        chatObserver.observe(chatMsgElement, chatConfig);
      }
    }
  }, 1000));
})(window, document, jQuery);
