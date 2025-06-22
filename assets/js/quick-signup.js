/**
 * JavaScript para o Quick Signup do WP WhatsApp Evolution
 */

jQuery(document).ready(function($) {
    // Estado do processo de signup
    let currentStep = 0;
    const steps = [
        'validating',
        'creating_account', 
        'configuring_plugin',
        'success'
    ];

    // Elementos DOM
    const $form = $('#wpwevo-quick-signup-form');
    const $progressContainer = $('#wpwevo-progress-container');
    const $progressBar = $('#wpwevo-progress-bar');
    const $progressText = $('#wpwevo-progress-text');
    const $successContainer = $('#wpwevo-success-container');
    const $errorContainer = $('#wpwevo-error-container');
    const $retryBtn = $('#wpwevo-retry-btn');
    const $qrContainer = $('#wpwevo-qr-container');

    // --- ELEMENTOS DA INTERFACE ---
    // IMPORTANTE: Certifique-se de que estes seletores correspondem ao seu HTML.
    const statusContainer = $('#wpwevo-status-container');
    const statusTitle = $('#connection-status-message');
    const statusDaysLeft = $('#trial-days-left-container');
    const statusMessage = $('#wpwevo-trial-expired-notice');
    const renewalModal = $('#wpwevo-upgrade-modal');

    /**
     * Função que chama a API para obter o status real da conta.
     */
    async function checkInitialStatus() {
        if (typeof wpwevo_quick_signup === 'undefined' || !wpwevo_quick_signup.api_key) {
            statusContainer.hide();
            return;
        }

        try {
            const response = await fetch('https://ydnobqsepveefiefmxag.supabase.co/functions/v1/plugin-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlkbm9icXNlcHZlZWZpZWZteGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NDkwOTAsImV4cCI6MjA2NTIyNTA5MH0.PlLrBA3eauvanWT-gQoKdvpTaPRrwgtuW8gZhbrlO7o'
                },
                body: JSON.stringify({ api_key: wpwevo_quick_signup.api_key })
            });

            if (!response.ok) {
                return;
            }

            const result = await response.json();

            if (result.success && result.data) {
                // 1. Atualiza a interface imediatamente para o usuário ver o status correto.
                updateUserInterface(result.data);
                
                // 2. 🚀 SINCRONIZA com o backend do WordPress para manter os dados consistentes.
                syncStatusWithWordPress(result.data);
            }

        } catch (error) {
            // Erro silencioso para produção
        }
    }

    /**
     * 🚀 NOVO: Envia os dados mais recentes para o backend do WordPress para serem salvos no banco de dados.
     * @param {object} statusData Os dados recebidos da API principal.
     */
    function syncStatusWithWordPress(statusData) {
        $.ajax({
            url: wpwevo_quick_signup.ajax_url,
            type: 'POST',
            data: {
                action: 'wpwevo_sync_status',
                nonce: wpwevo_quick_signup.nonce,
                status_data: statusData // jQuery lida com a serialização do objeto
            },
            success: function(response) {
                if (response.success) {
                    // Status sincronizado
                } else {
                    // Falha ao sincronizar
                }
            },
            error: function() {
                // Erro de AJAX
            }
        });
    }

    // --- PONTO DE ENTRADA ---
    // Executa a verificação assim que a página estiver pronta.
    checkInitialStatus();

    // Formulário de quick signup
    $form.on('submit', function(e) {
        e.preventDefault();
        startQuickSignup();
    });

    // Botão retry
    $retryBtn.on('click', function() {
        resetForm();
        startQuickSignup();
    });

    // Polling para verificar status
    let statusCheckInterval;

    function startQuickSignup() {
        resetContainers();
        showProgress();
        
        const formData = {
            action: 'wpwevo_quick_signup',
            nonce: wpwevo_quick_signup.nonce,
            name: $('#wpwevo-name').val(),
            email: $('#wpwevo-email').val(),
            whatsapp: $('#wpwevo-whatsapp').val()
        };

        // Etapa 1: Validando dados
        updateProgress(0, wpwevo_quick_signup.messages.validating);

        $.ajax({
            url: wpwevo_quick_signup.ajax_url,
            type: 'POST',
            data: formData,
            success: function(response) {
                if (response.success && response.data) {
                    // 🚀 OTIMIZADO: A configuração agora é salva no primeiro passo (PHP).
                    // Não há mais necessidade da função saveConfiguration().
                    // Ação: Mostra a tela de sucesso e o QR Code IMEDIATAMENTE.
                    updateProgress(3, wpwevo_quick_signup.messages.success);
                    showSuccess(response.data);

                } else {
                    const errorMessage = response.data ? (response.data.message || response.data.error) : wpwevo_quick_signup.messages.error;
                    showError(errorMessage);
                }
            },
            error: function(xhr, status, error) {
                let errorMessage = wpwevo_quick_signup.messages.error;
                
                // Tenta extrair mensagem específica do erro
                if (xhr.responseText) {
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        if (errorData.data && errorData.data.message) {
                            errorMessage = errorData.data.message;
                        }
                    } catch (e) {
                        // Erro silencioso para produção
                    }
                }
                
                showError(errorMessage);
            }
        });
    }

    function updateProgress(step, message) {
        currentStep = step;
        const percentage = ((step + 1) / steps.length) * 100;
        
        $progressBar.css('width', percentage + '%');
        $progressText.text(message);
        
        // Atualiza indicadores visuais dos steps
        $('.wpwevo-step').each(function(index) {
            const $step = $(this);
            if (index <= step) {
                $step.addClass('active');
            } else {
                $step.removeClass('active');
            }
            
            if (index < step) {
                $step.addClass('completed');
            }
        });
    }

    function showProgress() {
        hideAllContainers();
        $progressContainer.show();
    }

    function showSuccess(data) {
        hideAllContainers();
        $successContainer.show();
        
        // Preenche dados do sucesso
        $('#trial-days-left').text(data.trial_days_left || 7);
        
        if (data.dashboard_access) {
            $('#dashboard-url').attr('href', data.dashboard_access.url).text(data.dashboard_access.url);
            $('#dashboard-email').text(data.dashboard_access.email);
            $('#dashboard-password-value').text(data.dashboard_access.password);
            $('#dashboard-info').show();
        } else {
            $('#dashboard-info').hide();
        }
        
        // Mostra QR code imediatamente se disponível na resposta
        if (data.qr_code_base64) {
            const $qrContainer = $('#wpwevo-qr-container');
            if ($qrContainer.length) {
                $qrContainer.html(`<img src="${data.qr_code_base64}" style="width: 300px; height: 300px;" alt="QR Code WhatsApp" title="QR Code de Conexão do WhatsApp">`);
                $qrContainer.show();
            }
        }
        
        // Inicia polling para verificar conexão do WhatsApp
        startStatusPolling();
    }

    function showError(message) {
        hideAllContainers();
        $errorContainer.show();
        $('#wpwevo-error-message').text(message);
    }

    function hideAllContainers() {
        $progressContainer.hide();
        $successContainer.hide();
        $errorContainer.hide();
        $form.hide();
    }

    function resetContainers() {
        hideAllContainers();
        $form.show();
    }

    function resetForm() {
        currentStep = 0;
        clearInterval(statusCheckInterval);
        resetContainers();
        
        // Reset progress indicators
        $('.wpwevo-step').removeClass('active completed');
        $progressBar.css('width', '0%');
        $progressText.text('');
    }

    function startStatusPolling() {
        // ✅ Polling de 3 segundos para detecção rápida
        statusCheckInterval = setInterval(function() {
            checkPluginStatus();
        }, 3000);
        
        // Primeira verificação imediatamente
        checkPluginStatus();
    }

    function checkPluginStatus() {
        if (!wpwevo_quick_signup.api_key) return; // Não faz nada se não tiver chave

        $.ajax({
            url: admin_url('admin-ajax.php'),
            type: 'POST',
            data: {
                action: 'wpwevo_check_plugin_status',
                nonce: wpwevo_quick_signup.nonce, // Reutiliza o nonce principal
                api_key: wpwevo_quick_signup.api_key
            },
            success: function(response) {
                if (response.success && response.data && response.data.instance) {
                    const state = response.data.instance.state;
                    updateConnectionIndicator(state);

                    if (state === 'open') {
                        // Conectado com sucesso
                        $('#wpwevo-qr-container').hide();
                        $('#wpwevo-connection-success').show();
                        stopPolling(); // Para de verificar

                        // 🚀 CORREÇÃO: Recarrega a página para mostrar o status do plano atualizado.
                        setTimeout(function() {
                            window.location.reload();
                        }, 1500); // Delay para o usuário ver a mensagem de sucesso.
                        
                    } else {
                        // Ainda não conectado, mostra QR code se disponível
                        displayQRCode(response.data);
                    }
                } else {
                    // Mantém o polling ativo, pode ser um erro temporário
                }
            },
            error: function() {
                // Para o polling em caso de erro grave (ex: 500)
                stopPolling();
            }
        });
    }

    /**
     * Mostra o QR Code na tela usando a imagem base64 da API.
     * @param {object} apiData - O objeto 'data' da resposta da API (quick-signup).
     */
    function displayQRCode(apiData) {
        // 1. Encontre o elemento no HTML onde o QR Code deve aparecer.
        const $qrContainer = $('#wpwevo-qr-container');

        // Se o container não for encontrado, não faz nada.
        if (!$qrContainer.length) {
            return;
        }

        // 2. Pegue o QR Code base64.
        const qrCodeBase64 = apiData.qr_code;

        if (!qrCodeBase64) {
            $qrContainer.html('<div style="width: 300px; height: 300px; display: flex; align-items: center; justify-content: center; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 8px; text-align: center; padding: 15px;">❌ Erro:<br>O QR Code não foi recebido do servidor. Verifique o status da sua instância.</div>');
            $qrContainer.show();
            return;
        }

        // 3. Insira a imagem base64 diretamente.
        $qrContainer.html(`<img src="${qrCodeBase64}" style="width: 300px; height: 300px;" alt="QR Code WhatsApp" title="QR Code de Conexão do WhatsApp">`);
        $qrContainer.show();
    }

    // Máscara para WhatsApp
    $('#wpwevo-whatsapp').on('input', function() {
        let value = $(this).val().replace(/\D/g, '');
        
        // Limita a 11 dígitos (formato brasileiro)
        if (value.length > 11) {
            value = value.substring(0, 11);
        }
        
        // Formata conforme o usuário digita
        if (value.length >= 2) {
            value = '(' + value.substring(0, 2) + ') ' + value.substring(2);
        }
        if (value.length >= 10) {
            value = value.substring(0, 10) + '-' + value.substring(10);
        }
        
        $(this).val(value);
    });

    // Validação de email em tempo real
    $('#wpwevo-email').on('blur', function() {
        const email = $(this).val();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email && !emailRegex.test(email)) {
            $(this).addClass('error');
            $('#email-error').text('Email inválido').show();
        } else {
            $(this).removeClass('error');
            $('#email-error').hide();
        }
    });

    // Validação de campos obrigatórios
    function validateForm() {
        let isValid = true;
        
        $form.find('input[required]').each(function() {
            const $field = $(this);
            const value = $field.val().trim();
            
            if (!value) {
                $field.addClass('error');
                isValid = false;
            } else {
                $field.removeClass('error');
            }
        });
        
        return isValid;
    }

    // Ativa/desativa botão de submit baseado na validação
    $form.find('input').on('input', function() {
        const isValid = validateForm();
        $('#wpwevo-signup-btn').prop('disabled', !isValid);
    });

    // Link para upgrade
    $(document).on('click', '#upgrade-link', function(e) {
        e.preventDefault();
        window.open('https://whats-evolution.vercel.app/', '_blank');
    });

    // Auto-focus no primeiro campo
    $('#wpwevo-name').focus();

    // ===== LÓGICA DO MODAL DE UPGRADE =====

    const upgradeModal = document.getElementById('wpwevo-upgrade-modal');
    const paymentFeedback = document.getElementById('wpwevo-payment-feedback');
    let pollingInterval; // Variável para controlar o intervalo do polling

    // TORNAR FUNÇÕES GLOBAIS PARA ONCLICK DO HTML
    window.showUpgradeModal = function() {
        if (upgradeModal) {
            upgradeModal.style.display = 'block';
        }
    }

    window.closeUpgradeModal = function() {
        if (upgradeModal) {
            upgradeModal.style.display = 'none';
            stopPolling(); // Para o polling quando o modal é fechado
        }
    }

    window.createPayment = function() {
        const upgradeButton = upgradeModal.querySelector('.wpwevo-upgrade-btn');
        const originalButtonText = upgradeButton.innerHTML;
        upgradeButton.innerHTML = '⏳ Processando...';
        upgradeButton.disabled = true;

        paymentFeedback.style.display = 'none';

        jQuery.post(wpwevo_quick_signup.ajax_url, {
            action: 'wpwevo_create_payment',
            nonce: wpwevo_quick_signup.nonce
        }, function(response) {
            if (response.success) {
                // Lógica para decidir se é PIX ou URL de Redirecionamento
                const responseData = response.data;
                
                if (responseData.pix_qr_code_base64 && responseData.pix_copy_paste) {
                    // --- É PIX ---
                    // 1. Esconde a view normal e mostra a view do PIX
                    upgradeModal.querySelector('.wpwevo-modal-body').style.display = 'none';
                    document.getElementById('wpwevo-pix-payment-info').style.display = 'block';

                    // 2. Popula os dados do PIX
                    document.getElementById('wpwevo-pix-qr-code').src = 'data:image/png;base64,' + responseData.pix_qr_code_base64;
                    document.getElementById('wpwevo-pix-copy-paste').value = responseData.pix_copy_paste;
                    
                    // 3. Muda os botões do footer
                    upgradeButton.style.display = 'none'; // Esconde o botão "Assinar"
                    const cancelButton = upgradeModal.querySelector('.wpwevo-cancel-btn');
                    cancelButton.innerText = 'Fechar'; // Muda "Talvez depois" para "Fechar"

                    // 4. Inicia o polling para verificar o status do pagamento
                    if (responseData.api_key) {
                        startStatusPolling(responseData.api_key);
                    }

                } else if (responseData.payment_url && responseData.payment_url.startsWith('http')) {
                    // --- É URL de redirecionamento ---
                    paymentFeedback.style.color = '#155724';
                    paymentFeedback.innerText = '✅ Sucesso! Redirecionando para pagamento...';
                    paymentFeedback.style.display = 'block';
                    
                    setTimeout(function() {
                        window.open(responseData.payment_url, '_blank');
                        closeUpgradeModal();
                    }, 1500);

                } else {
                    // --- Erro: formato inesperado ---
                    paymentFeedback.style.color = '#721c24';
                    paymentFeedback.innerText = '❌ Erro: Resposta de pagamento inválida.';
                    paymentFeedback.style.display = 'block';
                    upgradeButton.innerHTML = originalButtonText;
                    upgradeButton.disabled = false;
                }

            } else {
                paymentFeedback.style.color = '#721c24';
                paymentFeedback.innerText = '❌ Erro: ' + (response.data ? response.data.message : 'Ocorreu um erro desconhecido.');
                paymentFeedback.style.display = 'block';
                upgradeButton.innerHTML = originalButtonText;
                upgradeButton.disabled = false;
            }
        }).fail(function() {
            paymentFeedback.style.color = '#721c24';
            paymentFeedback.innerText = '❌ Erro de conexão. Verifique sua internet e tente novamente.';
            paymentFeedback.style.display = 'block';
            upgradeButton.innerHTML = originalButtonText;
            upgradeButton.disabled = false;
        });
    };

    // ===== LÓGICA DE POLLING DE STATUS =====

    function startStatusPolling(apiKey) {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      pollingInterval = setInterval(() => {
        checkInstanceStatus(apiKey || wpwevo_quick_signup.api_key);
      }, 3000); // ✅ Polling de 3 segundos para detecção rápida

      setTimeout(() => {
          if (pollingInterval) {
              clearInterval(pollingInterval);
              // Opcional: mostrar uma mensagem para o usuário verificar mais tarde.
          }
      }, 300000); // Para após 5 minutos
    }

    function stopPolling() {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    }

    async function checkInstanceStatus(apiKey) {
      try {
        const response = await fetch('https://ydnobqsepveefiefmxag.supabase.co/functions/v1/plugin-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlkbm9icXNlcHZlZWZpZWZteGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NDkwOTAsImV4cCI6MjA2NTIyNTA5MH0.PlLrBA3eauvanWT-gQoKdvpTaPRrwgtuW8gZhbrlO7o'
          },
          body: JSON.stringify({ 
            api_key: apiKey || wpwevo_quick_signup.api_key 
          })
        });

        if (!response.ok) {
          console.error('Erro ao verificar status:', response.statusText);
          return;
        }

        const result = await response.json();

        if (result.success && result.data) {
            const statusData = result.data;
            
            // ✅ USE O CAMPO whatsapp_connected PARA DECIDIR SE ESTÁ CONECTADO
            if (statusData.whatsapp_connected) {
                // WhatsApp REALMENTE conectado
                updateUserInterface(statusData);
                stopPolling(); // Para o polling quando conectado
            } else {
                // WhatsApp não conectado - mostra QR code se disponível
                if (statusData.qr_code) {
                    displayQRCode(statusData);
                }
                // Continua o polling
            }
        } else {
            console.error('Erro na resposta da API:', result);
        }
      } catch (error) {
        console.error('Erro na requisição de status:', error);
      }
    }

    // Nova função para copiar o código PIX
    $(document).on('click', '#wpwevo-copy-pix-btn', function() {
        const copyText = document.getElementById('wpwevo-pix-copy-paste');
        copyText.select();
        document.execCommand('copy');

        const btn = $(this);
        const originalText = btn.text();
        btn.text('Copiado!');
        setTimeout(function() {
            btn.text(originalText);
        }, 2000);
    });

    // 🚀 ADAPTADO: Adicionar funcionalidade para copiar senha
    $('#copy-password-btn').on('click', function() {
        const password = $('#dashboard-password-value').text();
        navigator.clipboard.writeText(password).then(function() {
            const $btn = $('#copy-password-btn');
            const originalText = $btn.html();
            $btn.html('<span class="dashicons dashicons-yes"></span> ' + wpwevo_quick_signup.messages.copied);
            setTimeout(function() {
                $btn.html(originalText);
            }, 2000);
        }, function(err) {
            console.error('Erro ao copiar senha: ', err);
        });
    });

    /**
     * ATUALIZA A INTERFACE DE STATUS
     * @param {object} apiData - O objeto 'data' completo recebido da nossa API.
     */
    function updateUserInterface(apiData) {
        // Seletores dos elementos que queremos mudar.
        const titleElement = $('#connection-status-message');
        const daysLeftElement = $('#trial-days-left-container');
        const mainContainer = $('#wpwevo-status-container');
        const renewalModal = $('#wpwevo-upgrade-modal');
        const expiredNotice = $('#wpwevo-trial-expired-notice');

        // Se a conta tem dias restantes, mostre o status correto baseado no plano.
        if (apiData.trial_days_left > 0) {
            // ✅ LÓGICA CORRETA: Usar o campo user_plan para diferenciar os tipos de conta
            if (apiData.user_plan === 'basic') {
                // Usuário com plano Basic pago
                titleElement.text('Plano Basic');
                daysLeftElement.html(`Você tem <strong>${apiData.trial_days_left} dias</strong> restantes.`);
            } else if (apiData.user_plan === 'trial') {
                // Usuário em período de trial
                titleElement.text('Trial Ativo');
                daysLeftElement.html(`Você tem <strong>${apiData.trial_days_left} dias</strong> restantes.`);
            } else {
                // Fallback para outros planos ou planos não identificados
                const planName = apiData.user_plan ? apiData.user_plan.charAt(0).toUpperCase() + apiData.user_plan.slice(1) : 'Ativo';
                titleElement.text(`${planName} Ativo`);
                daysLeftElement.html(`Você tem <strong>${apiData.trial_days_left} dias</strong> restantes.`);
            }
            
            mainContainer.removeClass('status-expired').addClass('status-active');
            renewalModal.hide();
            expiredNotice.hide();
        } 
        // Se a conta NÃO tem dias restantes, mostre o status de Expirado.
        else {
            titleElement.text('Assinatura Expirada');
            daysLeftElement.text('Faça upgrade para reativar sua conta.');
            mainContainer.removeClass('status-active').addClass('status-expired');
            renewalModal.show();
            expiredNotice.show();
        }
    }
}); 