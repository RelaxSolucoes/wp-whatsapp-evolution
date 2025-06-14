/* Envio por status do pedido */
jQuery(document).ready(function($) {
    var $form = $('#wpwevo-status-messages-form');
    var $button = $form.find('button[type="submit"]');
    var $spinner = $form.find('.spinner');
    var $result = $('#wpwevo-save-result');

    // Função para serializar o formulário
    function serializeFormToObject($form) {
        var formData = {
            action: 'wpwevo_save_status_messages',
            nonce: wpwevoSendByStatus.nonce,
            status: {}
        };
        
        // Processa todos os status, independente do checkbox
        $form.find('.wpwevo-status-message').each(function() {
            var $statusBlock = $(this);
            var $checkbox = $statusBlock.find('input[type="checkbox"]');
            var $textarea = $statusBlock.find('textarea');
            var matches = $checkbox.attr('name').match(/status\[(.*?)\]/);
            if (!matches) return;
            
            var status = matches[1];
            // Sempre inclui o status, com enabled false quando desmarcado
            formData.status[status] = {
                enabled: $checkbox.is(':checked'),
                message: $textarea.val() || ''
            };
        });

        return formData;
    }

    // Salvar configurações
    $form.on('submit', function(e) {
        e.preventDefault();

        $button.prop('disabled', true);
        $spinner.addClass('is-active');
        $result.hide();

        var formData = serializeFormToObject($form);
        console.log('Enviando dados:', formData); // Log para debug

        $.ajax({
            url: wpwevoSendByStatus.ajaxurl,
            type: 'POST',
            data: formData,
            success: function(response) {
                console.log('Resposta:', response); // Log para debug
                if (response.success) {
                    showResult('success', response.data.message);
                } else {
                    showResult('error', response.data.message || wpwevoSendByStatus.i18n.error);
                }
            },
            error: function(xhr, status, error) {
                console.error('Erro:', error); // Log para debug
                showResult('error', wpwevoSendByStatus.i18n.error + ' ' + error);
            },
            complete: function() {
                $button.prop('disabled', false);
                $spinner.removeClass('is-active');
            }
        });
    });

    // Restaurar mensagem padrão
    $('.wpwevo-reset-message').on('click', function() {
        var $button = $(this);
        var defaultMessage = $button.data('default');
        var $textarea = $button.closest('.wpwevo-status-message').find('textarea');
        
        if (confirm(wpwevoSendByStatus.i18n.confirmReset)) {
            $textarea.val(defaultMessage);
        }
    });

    // Função para mostrar resultado
    function showResult(type, message) {
        var className = type === 'success' ? 'notice-success' : 'notice-error';
        $result.html('<div class="notice ' + className + '"><p>' + message + '</p></div>').fadeIn();
        
        if (type === 'success') {
            setTimeout(function() {
                window.location.reload();
            }, 1000);
        }
    }
}); 