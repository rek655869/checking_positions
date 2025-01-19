// ==UserScript==
// @name         Проверка должностей
// @author       rek655869
// @license      MIT
// @version      2.0.0
// @match        https://catwar.su/blog*
// @match        https://catwar.net/blog*
// @match        https://catwar.su/my_clan/link
// @match        https://catwar.net/my_clan/link
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js
// ==/UserScript==
(function () {
  'use strict';

  const $scriptStyle = $('<style></style>').attr({id: 'checking_positions-style'}).text(`
    /* Проверка должностей */
    #check_pos-container {
        padding: 0.3rem 0.7rem;
        max-width: 900px;
    }
    #check_pos-container > * {
        margin: 0.3rem 0;
    }
    #check_pos-container > input[type="checkbox"], #check_pos-results-table td input[type="checkbox"], label[for="creation-text"] {
        margin-right: 0.3rem !important;
    }
    #check_pos-container input[type="number"] {
        margin-left: 0.3rem !important;
    }
    #check_pos-container > div:first-of-type {
        padding-left: 1.25rem;
    }
    
    .progress-bar {
        width: 100%;
        height: 20px;
        background: #f3f3f3;
        border: 1px solid #ccc;
        border-radius: 5px;
        overflow: hidden;
        position: relative;
        margin: 0.3rem 0;
    }
    .progress-fill {
        width: 0%;
        height: 100%;
        background: #4caf50;
        transition: width 0.2s ease;
    }
    
    #check_pos-copy-ids, #check_pos-copy-names, .check_pos-position-checkbox, #check_pos-button:nth-child(3) {
        margin-left: 10px !important;
    }
    
    #check_pos-deleted-input {
        margin-left: 5px; 
        width: 90%;
    }
    
    .check_pos-results-table {
        border-collapse: collapse;
        width: 100%;
        margin-top: 10px;
        text-align: left;
    }
    
    .check_pos-results-table th {
        border: 1px solid;
        padding: 0.5rem;
        text-align: left;
    }
    .check_pos-results-table div {
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .check_pos-results-table tr td {
        border: 1px solid;
        padding: 0.3rem;
        border-bottom: none;
        border-top: none;
    }
    .check_pos-results-table tr > td > span:nth-of-type(1) {
        display: inline-block;
        width: 70px;
        text-align: left;
    }
    .check_pos-results-table tr > td > span:nth-of-type(2) {
        display: inline-block;
        padding-left: 0.7rem;
    }
    .check_pos-results-table tr > td > span:nth-of-type(3) {
        display: inline-block;
        padding-left: 0.7rem;
        font-style: italic;
    }
    
    #check_pos-notification {
        margin: 0.3rem;
        padding: 0.3rem;
        border-radius: 10px;
        width: 270px;
        background: rgba(255, 255, 255, 0.5);
        color: black;
    }
    `);

  let $settings = JSON.parse(localStorage.getItem('checking_positions-settings')) || {
    link: false,
    cat: false,
    group_by: true,
    columns: 3,
    deleted: false,
    selected_position: []
  };
  const saveSettings = () => localStorage.setItem('checking_positions-settings', JSON.stringify($settings));


  // ждём открытие страницы редактирования блога и её загрузку
  new MutationObserver(() => {
    if (location.href.includes('blogs?creation=')) {
      if ($('#creation_form').length) {
        addButton('blog');
      }
    } else if (location.href.includes('my_clan/link')) {
      if ($('form[method="post"]').length) {
        addButton('link');
      }
    }
  }).observe(document, {childList: true, subtree: true});


  /**
   * Добавляет кнопку "Проверка должностей" на страницу редактирования блога
   * @param {'blog'|'link'} location с какой страницы вызвана функция
   */
  function addButton(location) {
    let $checkButton = $('#check_pos-button');
    if (!$checkButton.length) {
      $('head').append($scriptStyle);
      $checkButton = $('<input>').attr({type: 'button', id: 'check_pos-button', value: 'Проверка должностей'});
      if (location === 'blog') {
        $('#creation_form').append($checkButton);

        $(document).on("click", "#creation_form [type='submit']", function () {
          const $container = $('#check_pos-container');
          if ($container) {
            $container.remove();
          }
        });

      } else {
        let $input = $('<input>').attr({ type: 'text', id: 'creation-text' });
        let $label = $('<label></label>').attr({for: 'creation-text'}).text('Введите один или несколько ID:');
        let $container = $('<div></div>').append($label).append($input).append($checkButton);
        $('form[method="post"]').after($container).after('<br>');
      }
      $checkButton.on('click', () => addConfig(location));
    }
  }

  /**
   * Добавляет настройки проверки должностей
   * @param {'blog'|'link'} location с какой страницы вызвана функция
   */
  function addConfig(location) {
    let $container = $('#check_pos-container');
    if ($container.length) {
      $container.toggle();
      return;
    }
    $container = $('<div></div>').attr({id: 'check_pos-container'});

    if (location === 'blog') {
      // учитывать link
      let $checkbox1 = $('<input>')
          .attr({type: 'checkbox', id: 'check_pos-link'})
          .prop('checked', $settings.link)
          .on('change', function () {
            $settings.link = $(this).is(':checked');
            saveSettings();
          });
      let $label1 = $('<label></label>').attr({for: 'check_pos-link'}).text('Учитывать [link...]');
      $container.append($checkbox1).append($label1).append('<br>');

      // учитывать cat
      let $checkbox2 = $('<input>')
          .attr({type: 'checkbox', id: 'check_pos-cat'})
          .prop('checked', $settings.cat)
          .on('change', function () {
            $settings.cat = $(this).is(':checked');
            saveSettings();
          });
      let $label2 = $('<label></label>').attr({for: 'check_pos-cat'}).text('Учитывать [url=cat...]');
      $container.append($checkbox2).append($label2).append('<br>');
    }

    // группировать по должности
    let $groupByCheckbox = $('<input>')
        .attr({type: 'checkbox', id: 'check_pos-group_by'})
        .prop('checked', $settings.group_by)
        .on('change', function () {
          $settings.group_by = $(this).is(':checked');
          saveSettings();
          $columnInputContainer.toggle();
          $('#dynamic-br').toggle(!$settings.group_by);
        });
    let $groupByLabel = $('<label></label>').attr({for: 'check_pos-group_by'}).text('Группировать по должности');
    $container.append($groupByCheckbox).append($groupByLabel);

    // поле для ввода количества столбцов
    let $columnInputContainer = $('<div></div>');
    let $columnInput = $('<input>')
        .attr({type: 'number', id: 'check_pos-columns', min: '1', max: '10'})
        .val($settings.columns)
        .on('change', function () {
          $settings.columns = $(this).val();
          saveSettings();
        });
    let $columnLabel = $('<label></label>').attr({for: 'check_pos-columns'}).text('Количество столбцов:');
    $columnInputContainer.append($columnLabel).append($columnInput);
    $container.append($columnInputContainer);

    let $button = $('<input>')
        .attr({type: 'button', id: 'check_pos-checking', value: 'Проверить'})
        .on('click', () => checking(location));
    $container.append('<br id="dynamic-br">').append($button);

    // для вывода уведомлений
    let $notification = $('<div></div>').attr({id: 'check_pos-notification-container'});
    $container.append($notification);

    if (location === 'blog') {
      $('#creation_form').append($container);
    } else {
      $('#branch > div:first-of-type').after($container);
    }
    $columnInputContainer.toggle($settings.group_by);
    $('#dynamic-br').toggle(!$settings.group_by);

  }


  /**
   * Основная функция для проверки: получение всех игроков и вывод таблицы
   * @param {'blog'|'link'} location с какой страницы вызвана функция
   */
  async function checking(location) {
    let $checkButton = $('#check_pos-checking');
    $checkButton.prop('disabled', true); // запрещаем повторное нажатие

    let $resultContainer = $('#check_pos-result-container');
    if ($resultContainer.length) {
      $resultContainer.remove();
    }

    let $container = $('#check_pos-container');
    $resultContainer = $('<div></div>').attr({id: 'check_pos-result-container'});
    $container.append($resultContainer);

    let ids;

    if (location === 'blog') {
      let code = $("#creation-text").text();
      let results = code.match(/(link|cat)[0-9]+/gm);

      if (!results) {
        showNotification("Не найдено ни одного ID");
        $checkButton.prop('disabled', false);
        return;
      }

      ids = Array.from(
          new Set(
              results
                  .filter((result) => {
                    if (result.startsWith('link') && $settings.link) return true;
                    if (result.startsWith('cat') && $settings.cat) return true;
                    return false;
                  })
                  .map((result) => result.replace(/cat|link/, ''))
          )
      );
    } else {
      let code = $("#creation-text").val();
      ids = code.match(/\d+/g);

      if (!ids) {
        showNotification("Не найдено ни одного ID");
        $checkButton.prop('disabled', false);
        return;
      }
    }

    let $progressBar = $('<div></div>').addClass('progress-bar');
    let $progressFill = $('<div></div>').addClass('progress-fill');
    $progressBar.append($progressFill);
    $resultContainer.append($progressBar);

    let players = [];
    for (let i = 0; i < ids.length; i++) {
      let id = ids[i];
      let player = await getPlayer(id);
      players.push(player);

      let progress = ((i + 1) / ids.length) * 100;
      $progressFill.css('width', `${progress}%`);
    }

    $progressBar.remove();

    let fullPlayers = players.filter(player => player.id && player.name && player.position);
    let noName = players.filter(player => player.id && !player.name && !player.position);
    let noPosition = players.filter(player => player.id && player.name && !player.position);

    // добавляем кнопки сброса и копирования ID
    if (!$('#check_pos-reset-selection').length) {
      let $button = $('<input>')
          .attr({type: 'button', id: 'check_pos-reset-selection', value: 'Сбросить выделение'})
          .on('click', resetSelection);
      $resultContainer.append($button);

      $button = $('<input>')
          .attr({type: 'button', id: 'check_pos-copy-ids', value: 'Скопировать ID'})
          .css({marginLeft: '10px'})
          .on('click', copyIds);
      $resultContainer.append($button);

        $button = $('<input>')
            .attr({type: 'button', id: 'check_pos-copy-names', value: 'Скопировать имена'})
            .css({marginLeft: '10px'})
            .on('click', copyNames);
        $resultContainer.append($button);

      $button = $('<input>')
          .attr({type: 'button', id: 'check_pos-copy-ids-names', value: 'Скопировать ID и имена'})
          .css({marginLeft: '10px'})
          .on('click', copyIdsNames);
      $resultContainer.append($button);
    }

    // добавляем таблицы
    if ($('#check_pos-group_by').is(':checked')) {
      let positions = {};
      fullPlayers.forEach(player => {
        if (!positions[player.position]) {
          positions[player.position] = [];
        }
        let name = player.name;
        let id = player.id;
        positions[player.position].push({id, name});
      });
      renderGroups(positions);
    } else {
      renderAll(fullPlayers);
    }

    // чекбокс и поле ввода для "Удалены"
    let $deletedCheckbox = $('<input>')
        .attr({type: 'checkbox', id: 'check_pos-deleted'})
        .prop('checked', $settings.deleted)
        .on('change', function () {
          $settings.deleted = $(this).is(':checked');
          saveSettings();
        });

    let $deletedInput = $('<input>')
        .attr({type: 'text', id: 'check_pos-deleted-input'})
        .val(noName.map(player => player.id).join(' '));

    $resultContainer
        .append($deletedCheckbox)
        .append(' Удалены:')
        .append($deletedInput)
        .append('<br>');

    renderNoPositions(noPosition);

    $checkButton.prop('disabled', false);
  }

  /**
   * Копирование ID в буфер
   */
  function copyIds() {
    let ids = $('.check_pos-player-checkbox:checked').map(function () {
      return $(this).data('player-id');
    }).get();

    let $deletedIds = $('#check_pos-deleted-input');
    if ($deletedIds.val()) {
      ids = ids.concat($deletedIds.val().split(' '))
    }

    let uniqueIds = Array.from(new Set(ids.filter(id => id)));

    navigator.clipboard.writeText(uniqueIds.join('\n')).then(() => {
      showNotification('ID успешно скопированы', 3000);
    }).catch(err => {
      showNotification("Не удалось скопировать ID");
      console.error('Ошибка при копировании:', err);
    });
  }

  /**
   * Копирование имен в буфер
   */
  function copyNames() {
    let names = $('.check_pos-player-checkbox:checked').map(function () {
      return $(this).siblings('span').eq(1).text();
    }).get();

    navigator.clipboard.writeText(names.join('\n')).then(() => {
      showNotification('Имена успешно скопированы', 3000);
    }).catch(err => {
      showNotification("Не удалось скопировать имена");
      console.error('Ошибка при копировании:', err);
    });
  }

  /**
   * Копирование ID и имен в буфер
   */
  function copyIdsNames() {
    let idNamePairs = $('.check_pos-player-checkbox:checked').map(function () {
      let id = $(this).data('player-id');
      let name = $(this).siblings('span').eq(1).text();
      return `${id};${name}`;
    }).get();

    let $deletedIds = $('#check_pos-deleted-input');
    if ($deletedIds.val()) {
      idNamePairs = idNamePairs.concat($deletedIds.val().split(' ').map(id => `${id}; `));
    }

    let uniquePairs = Array.from(new Set(idNamePairs.filter(pair => pair)));

    navigator.clipboard.writeText(uniquePairs.join('\n')).then(() => {
      showNotification('ID и имена успешно скопированы', 3000);
    }).catch(err => {
      showNotification("Не удалось скопировать ID и имена");
      console.error('Ошибка при копировании:', err);
    });
  }

  /**
   * Получение данных об игроке
   * @param {string} id ID игрока
   * @returns {Promise<{id: string, name: string | null, position: string | null}> | null}
   */
  async function getPlayer(id) {
    try {
      const data = await fetch("https://catwar.net/cat" + id, {
        headers: {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "ru-RU,ru;q=0.9,en-GB;q=0.8,en;q=0.7,en-US;q=0.6",
          "cache-control": "no-cache",
          "sec-ch-ua": "\"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
        referrer: "https://catwar.net/top",
        referrerPolicy: "strict-origin-when-cross-origin",
        body: null,
        method: "GET",
        mode: "cors",
        credentials: "include"
      });

      const responseText = await data.text();

      let name = responseText.match(/<big>[А-яё ]+<\/big>/);
      if (!name) return {id: id}; // игрок удалён или не существует

      name = name.toString().replace(/[<big>\/]+/g, '');

      let position = responseText.match(/<i>[А-яё ]+<\/i>/);
      if (position) {
        position = position.toString().replace(/[<i>\/]+/g, '');
      }
      return {id: id, name: name, position: position};

    } catch (error) {
      console.error(`Ошибка при получении игрока ${id}: `, error);
    }

  }


  /**
   * Таблица (таблицы) с разбиением по должностям
   * @param players список игроков
   */
  function renderGroups(players) {
    const positions = Object.keys(players);
    const maxColumns = Number($settings.columns);
    let positionGroups = [];

    for (let i = 0; i < positions.length; i += maxColumns) {
      positionGroups.push(positions.slice(i, i + maxColumns));
    }

    positionGroups.forEach(group => {
      const maxRows = Math.max(...group.map(pos => Array.isArray(players[pos]) ? players[pos].length : 0));

      let $table = $('<table></table>').addClass('check_pos-results-table');

      let $headerRow = $('<tr></tr>');
      group.forEach(position => {
        if (players[position]) {
          let $positionCheckbox = $('<input>')
              .attr({ type: 'checkbox', class: 'check_pos-position-checkbox' })
              .prop('checked', $settings.selected_position.includes(position))
              .on('change', function () {
                let isChecked = $(this).is(':checked');
                if (isChecked) {
                  $settings.selected_position.push(position);
                } else {
                  $settings.selected_position.splice($settings.selected_position.indexOf(position), 1);
                }
                saveSettings();

                $(`.check_pos-player-checkbox[data-position="${position}"]`).prop('checked', isChecked);
              });

          let $headerContainer = $('<div></div>')
              .append($('<span></span>').text(position))
              .append($positionCheckbox);
          let $headerCell = $('<th></th>').append($headerContainer);
          $headerRow.append($headerCell);
        }
      });
      $table.append($headerRow);

      for (let i = 0; i < maxRows; i++) {
        let $row = $('<tr></tr>');
        group.forEach(position => {
          const player = players[position] && players[position][i];
          let $cell = $('<td></td>');

          if (player) {
            let $playerCheckbox = $('<input>')
                .attr({
                  type: 'checkbox',
                  class: 'check_pos-player-checkbox',
                  'data-position': position,
                  'data-player-id': player.id
                })
                .prop('checked', $settings.selected_position.includes(position));

            $cell.append($playerCheckbox).append(' ')
                .append($('<span></span>').text(player.id))
                .append($('<span></span>').text(player.name));
          } else {
            $cell.text('');
          }

          $row.append($cell);
          if (i === maxRows - 1) {
            $cell.css('border-bottom', '1px solid');
          }
        });
        $table.append($row);
      }

      $('#check_pos-result-container').append($table).append('<br>');
    });
  }

  /**
   * Таблица без разбиения по должностям
   * @param players список игроков
   */
  function renderAll(players) {
    if (players && players.length > 0) {
      let maxRows = players.length;
      let $table = $('<table></table>').addClass('check_pos-results-table');

      let $positionCheckbox = $('<input>')
          .attr({type: 'checkbox', class: 'check_pos-position-checkbox'})
          .prop('checked', $settings.selected_position.includes('все'))
          .on('change', function () {
            let isChecked = $(this).is(':checked');
            if (isChecked) {
              $settings.selected_position.push('все')
            } else {
              $settings.selected_position.splice($settings.selected_position.indexOf('все'), 1);
            }
            saveSettings();

            $(`.check_pos-player-checkbox[data-position="all"]`).prop('checked', isChecked);
          });

      let $headerContainer = $('<div></div>')
          .append($('<span></span>').text('Все игроки'))
          .append($positionCheckbox);
      let $headerCell = $('<th></th>').append($headerContainer);
      let $headerRow = $('<tr></tr>').append($headerCell);
      $table.append($headerRow);

      players.forEach((player, i) => {
        let $row = $('<tr></tr>');

        let $playerCheckbox = $('<input>')
            .attr({
              type: 'checkbox',
              class: 'check_pos-player-checkbox',
              'data-position': 'all',
              'data-player-id': player.id
            })
            .prop('checked', $settings.selected_position.includes('все'));

        let $cell = $('<td></td>').append($playerCheckbox)
            .append(' ')
            .append($('<span></span>').text(player.id))
            .append($('<span></span>').text(player.name))
            .append($('<span></span>').text(player.position));

        $row.append($cell);
        if (i === maxRows - 1) {
          $cell.css('border-bottom', '1px solid #ddd');
        }
        $table.append($row);
      });

      $('#check_pos-result-container').append($table).append('<br>');
    }
  }

  /**
   * Таблица игроков без должности
   * @param noPosition список игроков
   */
  function renderNoPositions(noPosition) {
    if (noPosition && noPosition.length > 0) {
      let maxRows = noPosition.length;
      let $table = $('<table></table>').addClass('check_pos-results-table');

      let $positionCheckbox = $('<input>')
          .attr({type: 'checkbox', class: 'check_pos-position-checkbox'})
          .prop('checked', $settings.selected_position.includes('иноплеменные'))
          .on('change', function () {
            let isChecked = $(this).is(':checked');
            if (isChecked) {
              $settings.selected_position.push('иноплеменные')
            } else {
              $settings.selected_position.splice($settings.selected_position.indexOf('иноплеменные'), 1);
            }
            saveSettings();

            $(`.check_pos-player-checkbox[data-position="no"]`).prop('checked', isChecked);
          });

      let $headerContainer = $('<div></div>')
          .append($('<span></span>').text('Не в племени/клане'))
          .append($positionCheckbox);
      let $headerCell = $('<th></th>').append($headerContainer);
      let $headerRow = $('<tr></tr>').append($headerCell);
      $table.append($headerRow);

      noPosition.forEach((player, i) => {
        let $row = $('<tr></tr>');

        let playerCheckbox = $('<input>')
            .attr({
              type: 'checkbox',
              class: 'check_pos-player-checkbox',
              'data-position': 'no',
              'data-player-id': player.id
            })
            .prop('checked', $settings.selected_position.includes('иноплеменные'));

        let $cell = $('<td></td>')
            .append(playerCheckbox)
            .append(' ')
            .append($('<span></span>').text(player.id))
            .append($('<span></span>').text(player.name));

        $row.append($cell);
        if (i === maxRows - 1) {
          $cell.css('border-bottom', '1px solid #ddd');
        }
        $table.append($row);

        $('#check_pos-result-container').append($table);
      });
    }
  }

  /**
   * Убрать выделение на всех чекбоксах
   */
  function resetSelection() {
    $('#check_pos-result-container .check_pos-player-checkbox').prop('checked', false);
    $('#check_pos-result-container .check_pos-position-checkbox').prop('checked', false);
    $('#check_pos-deleted').prop('checked', false);

    $settings.deleted = false;
    $settings.selected_position = [];
    saveSettings();
  }

  /**
   * Вывод уведомления
   * @param message
   * @param duration
   */
  function showNotification(message, duration = 0) {
    let $notification = $('#check_pos-notification');
    if ($notification.length) {
      $notification.remove();
    }

    $notification = $('<div></div>').attr({ id: 'check_pos-notification' }).text(message).toggle(false);
    $('#check_pos-notification-container').append($notification);
    $notification.show(200);

    // убираем уведомление через заданное время
    if (duration !== 0) {
      setTimeout(() => {
        $notification.hide(200, () => $notification.remove());
      }, duration);
    }
  }

})(window, document, jQuery);