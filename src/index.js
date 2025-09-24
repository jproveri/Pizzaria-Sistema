/**
 * Sistema de Pizzaria (versão simples em um único arquivo)
 * Feito de forma didática como se fosse por um estudante do 2º semestre.
 * Funcionalidades:
 *  - Cadastro de Clientes (CRUD)
 *  - Cadastro de Produtos (CRUD) – pizzas, refrigerantes, sobremesas, outros
 *  - Registro de Pedidos com recibo
 *  - Relatórios: pizzas vendidas por dia e por mês
 *  - Extras: promoções simples, formas de pagamento, histórico de compras do cliente
 *  - Executável via: npx ts-node src/index.ts (ou compilar e rodar com node)
 *
 * Observações:
 *  - Tudo em memória (ao encerrar o programa os dados somem)
 *  - Foco na simplicidade / clareza, não em arquitetura avançada
 */
// Imports simples (tipados como any para evitar erros de types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
var readline = require('readline-sync');
// ---------------- Tipos / Modelos ----------------
var CategoriaProduto;
(function (CategoriaProduto) {
    CategoriaProduto["Pizza"] = "Pizza";
    CategoriaProduto["Refrigerante"] = "Refrigerante";
    CategoriaProduto["Sobremesa"] = "Sobremesa";
    CategoriaProduto["Outro"] = "Outro";
})(CategoriaProduto || (CategoriaProduto = {}));
var FormaPagamento;
(function (FormaPagamento) {
    FormaPagamento["Dinheiro"] = "Dinheiro";
    FormaPagamento["Cartao"] = "Cartao";
    FormaPagamento["Pix"] = "Pix";
})(FormaPagamento || (FormaPagamento = {}));
// ---------------- Armazenamento em memória ----------------
var clientes = [];
var produtos = [];
var pedidos = [];
// Geradores simples de ID incremental
var nextClienteId = 1;
var nextProdutoId = 1;
var nextPedidoId = 1;
// ---------------- Persistência em CSV ----------------
// Diretório de dados relativo ao arquivo (../data)
var DATA_DIR = path.resolve(__dirname, '..', 'data');
var FILE_CLIENTES = path.join(DATA_DIR, 'clientes.csv');
var FILE_PRODUTOS = path.join(DATA_DIR, 'produtos.csv');
var FILE_PEDIDOS = path.join(DATA_DIR, 'pedidos.csv');
var FILE_ITENS = path.join(DATA_DIR, 'itens_pedido.csv');
function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR))
        fs.mkdirSync(DATA_DIR, { recursive: true });
}
function sanitize(text) { return text.replace(/[\r\n;]/g, ' ').trim(); }
function salvarCSV() {
    ensureDataDir();
    // clientes.csv -> id;nome;telefone;endereco;historicoPedidosIds(|)
    fs.writeFileSync(FILE_CLIENTES, clientes.map(function (c) { return [c.id, sanitize(c.nome), sanitize(c.telefone), sanitize(c.endereco), c.historicoPedidosIds.join('|')].join(';'); }).join('\n'), 'utf-8');
    // produtos.csv -> id;nome;categoria;preco;ativo
    fs.writeFileSync(FILE_PRODUTOS, produtos.map(function (p) { return [p.id, sanitize(p.nome), p.categoria, p.preco, p.ativo ? 1 : 0].join(';'); }).join('\n'), 'utf-8');
    // pedidos.csv -> id;idCliente;dataISO;totalBruto;desconto;totalLiquido;formaPagamento;obs
    fs.writeFileSync(FILE_PEDIDOS, pedidos.map(function (p) { return [p.id, p.cliente.id, p.data.toISOString(), p.totalBruto, p.desconto, p.totalLiquido, p.formaPagamento, sanitize(p.observacaoPromocao || '')].join(';'); }).join('\n'), 'utf-8');
    // itens_pedido.csv -> idPedido;idProduto;quantidade;precoUnit
    var itens = [];
    for (var _i = 0, pedidos_1 = pedidos; _i < pedidos_1.length; _i++) {
        var ped = pedidos_1[_i];
        for (var _a = 0, _b = ped.itens; _a < _b.length; _a++) {
            var it = _b[_a];
            itens.push([ped.id, it.produto.id, it.quantidade, it.produto.preco].join(';'));
        }
    }
    fs.writeFileSync(FILE_ITENS, itens.join('\n'), 'utf-8');
}
function carregarCSV() {
    if (!fs.existsSync(DATA_DIR))
        return;
    try {
        // Produtos
        if (fs.existsSync(FILE_PRODUTOS)) {
            var linhas = String(fs.readFileSync(FILE_PRODUTOS, 'utf-8')).split(/\r?\n/).filter(function (l) { return l.trim(); });
            for (var _i = 0, linhas_1 = linhas; _i < linhas_1.length; _i++) {
                var l = linhas_1[_i];
                var _a = l.split(';'), idStr = _a[0], nomeRaw = _a[1], categoriaRaw = _a[2], precoStr = _a[3], ativoStr = _a[4];
                var nome = nomeRaw || 'SemNome';
                var categoria = categoriaRaw || CategoriaProduto.Outro;
                produtos.push({ id: Number(idStr || '0'), nome: nome, categoria: categoria, preco: Number(precoStr || '0'), ativo: ativoStr === '1' });
            }
            nextProdutoId = produtos.reduce(function (m, p) { return p.id > m ? p.id : m; }, 0) + 1;
        }
        // Clientes
        if (fs.existsSync(FILE_CLIENTES)) {
            var linhas = String(fs.readFileSync(FILE_CLIENTES, 'utf-8')).split(/\r?\n/).filter(function (l) { return l.trim(); });
            for (var _b = 0, linhas_2 = linhas; _b < linhas_2.length; _b++) {
                var l = linhas_2[_b];
                var _c = l.split(';'), idStr = _c[0], nomeRaw = _c[1], telefoneRaw = _c[2], enderecoRaw = _c[3], histStr = _c[4];
                var nome = nomeRaw || 'Cliente';
                var telefone = telefoneRaw || '';
                var endereco = enderecoRaw || '';
                clientes.push({ id: Number(idStr || '0'), nome: nome, telefone: telefone, endereco: endereco, historicoPedidosIds: histStr ? histStr.split('|').filter(function (x) { return x; }).map(Number) : [] });
            }
            nextClienteId = clientes.reduce(function (m, c) { return c.id > m ? c.id : m; }, 0) + 1;
        }
        // Pedidos
        var pedidosBase = {};
        if (fs.existsSync(FILE_PEDIDOS)) {
            var linhas = String(fs.readFileSync(FILE_PEDIDOS, 'utf-8')).split(/\r?\n/).filter(function (l) { return l.trim(); });
            var _loop_1 = function (l) {
                var _h = l.split(';'), idStr = _h[0], idClienteStr = _h[1], dataISO = _h[2], totalBrutoStr = _h[3], descontoStr = _h[4], totalLiquidoStr = _h[5], formaStr = _h[6], obsRaw = _h[7];
                var id = Number(idStr || '0');
                var cli = clientes.find(function (c) { return c.id === Number(idClienteStr || '-1'); });
                if (!cli)
                    return "continue";
                var pedido = {
                    id: id,
                    cliente: cli,
                    itens: [],
                    totalBruto: Number(totalBrutoStr || '0'),
                    desconto: Number(descontoStr || '0'),
                    totalLiquido: Number(totalLiquidoStr || '0'),
                    data: new Date(dataISO || new Date().toISOString()),
                    formaPagamento: formaStr || FormaPagamento.Dinheiro
                };
                if (obsRaw)
                    pedido.observacaoPromocao = obsRaw;
                pedidosBase[id] = pedido;
            };
            for (var _d = 0, linhas_3 = linhas; _d < linhas_3.length; _d++) {
                var l = linhas_3[_d];
                _loop_1(l);
            }
        }
        // Itens
        if (fs.existsSync(FILE_ITENS)) {
            var linhas = String(fs.readFileSync(FILE_ITENS, 'utf-8')).split(/\r?\n/).filter(function (l) { return l.trim(); });
            var _loop_2 = function (l) {
                var _j = l.split(';'), idPedidoStr = _j[0], idProdutoStr = _j[1], qtdStr = _j[2];
                var pedido = pedidosBase[Number(idPedidoStr)];
                var prod = produtos.find(function (p) { return p.id === Number(idProdutoStr); });
                if (pedido && prod) {
                    pedido.itens.push({ produto: prod, quantidade: Number(qtdStr) });
                }
            };
            for (var _e = 0, linhas_4 = linhas; _e < linhas_4.length; _e++) {
                var l = linhas_4[_e];
                _loop_2(l);
            }
        }
        for (var _f = 0, _g = Object.keys(pedidosBase); _f < _g.length; _f++) {
            var idStr = _g[_f];
            var ped = pedidosBase[Number(idStr)];
            if (ped)
                pedidos.push(ped);
        }
        nextPedidoId = pedidos.reduce(function (m, p) { return p.id > m ? p.id : m; }, 0) + 1;
    }
    catch (e) {
        console.log('Erro ao carregar CSV:', e);
    }
}
carregarCSV();
if (produtos.length === 0) {
    salvarCSV();
}
// --------------------------------------------------
// ---------------- Utilidades ----------------
function lerNumero(pergunta) {
    while (true) {
        var entrada = readline.question(pergunta).trim().replace(',', '.');
        var n = Number(entrada);
        if (!isNaN(n))
            return n;
        console.log('Valor inválido. Tente novamente.');
    }
}
function lerOpcaoLista(arr, pergunta) {
    while (true) {
        var n = lerNumero(pergunta);
        if (n >= 1 && n <= arr.length)
            return n - 1;
        console.log('Opção inválida.');
    }
}
function formatarData(d) {
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return "".concat(yyyy, "-").concat(mm, "-").concat(dd);
}
function formatarMes(d) {
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    return "".concat(yyyy, "-").concat(mm);
}
// ---------------- CRUD Clientes ----------------
function cadastrarCliente() {
    console.log('\n== Cadastrar Cliente ==');
    var nome = readline.question('Nome: ').trim();
    var telefone = readline.question('Telefone: ').trim();
    var endereco = readline.question('Endereco: ').trim();
    var cliente = { id: nextClienteId++, nome: nome, telefone: telefone, endereco: endereco, historicoPedidosIds: [] };
    clientes.push(cliente);
    console.log('Cliente cadastrado com sucesso. ID:', cliente.id);
    salvarCSV();
}
function listarClientes() {
    console.log('\n== Lista de Clientes ==');
    if (clientes.length === 0) {
        console.log('Nenhum cliente.');
        return;
    }
    clientes.forEach(function (c) {
        console.log("ID ".concat(c.id, " | ").concat(c.nome, " | Tel: ").concat(c.telefone, " | End: ").concat(c.endereco, " | Pedidos: ").concat(c.historicoPedidosIds.length));
    });
}
function atualizarCliente() {
    listarClientes();
    var id = lerNumero('ID do cliente para atualizar: ');
    var c = clientes.find(function (x) { return x.id === id; });
    if (!c) {
        console.log('Cliente não encontrado.');
        return;
    }
    var novoNome = readline.question("Nome (".concat(c.nome, "): ")).trim();
    var novoTel = readline.question("Telefone (".concat(c.telefone, "): ")).trim();
    var novoEnd = readline.question("Endereco (".concat(c.endereco, "): ")).trim();
    if (novoNome)
        c.nome = novoNome;
    if (novoTel)
        c.telefone = novoTel;
    if (novoEnd)
        c.endereco = novoEnd;
    console.log('Atualizado.');
    salvarCSV();
}
function excluirCliente() {
    listarClientes();
    var id = lerNumero('ID do cliente para excluir: ');
    var idx = clientes.findIndex(function (c) { return c.id === id; });
    if (idx === -1) {
        console.log('Cliente não encontrado.');
        return;
    }
    clientes.splice(idx, 1);
    console.log('Removido.');
    salvarCSV();
}
// ---------------- CRUD Produtos ----------------
function cadastrarProduto() {
    var _a;
    console.log('\n== Cadastrar Produto ==');
    var nome = readline.question('Nome: ').trim();
    console.log('Categorias:');
    var categorias = Object.values(CategoriaProduto);
    categorias.forEach(function (c, i) { return console.log("".concat(i + 1, ". ").concat(c)); });
    var catIdx = lerOpcaoLista(categorias, 'Escolha categoria (numero): ');
    var preco = lerNumero('Preço (ex: 39.90): ');
    var categoriaEscolhida = (_a = categorias[catIdx]) !== null && _a !== void 0 ? _a : CategoriaProduto.Outro; // fallback
    var produto = { id: nextProdutoId++, nome: nome, categoria: categoriaEscolhida, preco: preco, ativo: true };
    produtos.push(produto);
    console.log('Produto cadastrado. ID:', produto.id);
    salvarCSV();
}
function listarProdutos() {
    console.log('\n== Lista de Produtos ==');
    if (produtos.length === 0) {
        console.log('Nenhum produto.');
        return;
    }
    produtos.forEach(function (p) {
        console.log("ID ".concat(p.id, " | ").concat(p.nome, " | ").concat(p.categoria, " | R$ ").concat(p.preco.toFixed(2), " | ").concat((p.ativo ? 'Ativo' : 'Inativo')));
    });
}
function atualizarProduto() {
    listarProdutos();
    var id = lerNumero('ID do produto para atualizar: ');
    var p = produtos.find(function (x) { return x.id === id; });
    if (!p) {
        console.log('Não encontrado.');
        return;
    }
    var novoNome = readline.question("Nome (".concat(p.nome, "): ")).trim();
    if (novoNome)
        p.nome = novoNome;
    var novoPrecoStr = readline.question("Pre\u00E7o (".concat(p.preco, "): ")).trim();
    if (novoPrecoStr) {
        var val = Number(novoPrecoStr.replace(',', '.'));
        if (!isNaN(val))
            p.preco = val;
    }
    var mudarStatus = readline.question('Alterar status ativo? (s/n): ').trim().toLowerCase();
    if (mudarStatus === 's')
        p.ativo = !p.ativo;
    console.log('Produto atualizado.');
    salvarCSV();
}
function excluirProduto() {
    listarProdutos();
    var id = lerNumero('ID do produto para excluir: ');
    var idx = produtos.findIndex(function (p) { return p.id === id; });
    if (idx === -1) {
        console.log('Não encontrado.');
        return;
    }
    produtos.splice(idx, 1);
    console.log('Produto removido.');
    salvarCSV();
}
// ---------------- Promoções ----------------
/**
 * Regras simples:
 *  - Se comprar 3 ou mais pizzas: 10% no valor das pizzas
 *  - Quarta-feira (dia 3 -> getDay()=3) tem 5% em pizzas (acumulável até máx 15% sobre pizzas)
 *  - Se pagar em PIX e total bruto > 100: +2% no total geral
 */
function calcularDesconto(itens, data, forma) {
    var desconto = 0;
    var observacoes = [];
    var pizzas = itens.filter(function (i) { return i.produto.categoria === CategoriaProduto.Pizza; });
    var totalPizzas = pizzas.reduce(function (s, i) { return s + i.produto.preco * i.quantidade; }, 0);
    var qtdPizzas = pizzas.reduce(function (s, i) { return s + i.quantidade; }, 0);
    if (qtdPizzas >= 3) {
        var d = totalPizzas * 0.10;
        desconto += d;
        observacoes.push('Promoção 3+ pizzas (10%)');
    }
    if (data.getDay() === 3 && totalPizzas > 0) { // quarta-feira
        var d = totalPizzas * 0.05;
        desconto += d;
        observacoes.push('Quarta da Pizza (5%)');
    }
    var totalBruto = itens.reduce(function (s, i) { return s + i.produto.preco * i.quantidade; }, 0);
    if (forma === FormaPagamento.Pix && totalBruto > 100) {
        var d = totalBruto * 0.02;
        desconto += d;
        observacoes.push('PIX acima de 100 (2%)');
    }
    return { valor: desconto, observacao: observacoes.join('; ') };
}
// ---------------- Pedidos ----------------
function realizarPedido() {
    var _a;
    console.log('\n== Novo Pedido ==');
    if (clientes.length === 0) {
        console.log('Cadastre clientes primeiro.');
        return;
    }
    if (produtos.filter(function (p) { return p.ativo; }).length === 0) {
        console.log('Cadastre produtos ativos.');
        return;
    }
    listarClientes();
    var idCliente = lerNumero('ID do cliente: ');
    var cliente = clientes.find(function (c) { return c.id === idCliente; });
    if (!cliente) {
        console.log('Cliente não encontrado.');
        return;
    }
    var itens = [];
    var _loop_3 = function () {
        listarProdutos();
        var idProduto = lerNumero('ID do produto (0 para finalizar seleção): ');
        if (idProduto === 0)
            return "break";
        var produto = produtos.find(function (p) { return p.id === idProduto && p.ativo; });
        if (!produto) {
            console.log('Produto inválido ou inativo.');
            return "continue";
        }
        var qtd = lerNumero('Quantidade: ');
        if (qtd <= 0) {
            console.log('Qtd inválida.');
            return "continue";
        }
        itens.push({ produto: produto, quantidade: qtd });
        var mais = readline.question('Adicionar mais itens? (s/n): ').trim().toLowerCase();
        if (mais !== 's')
            return "break";
    };
    while (true) {
        var state_1 = _loop_3();
        if (state_1 === "break")
            break;
    }
    if (itens.length === 0) {
        console.log('Nenhum item adicionado. Pedido cancelado.');
        return;
    }
    console.log('Formas de Pagamento:');
    var formas = Object.values(FormaPagamento);
    formas.forEach(function (f, i) { return console.log("".concat(i + 1, ". ").concat(f)); });
    var idxForma = lerOpcaoLista(formas, 'Escolha (numero): ');
    var forma = (_a = formas[idxForma]) !== null && _a !== void 0 ? _a : FormaPagamento.Dinheiro;
    var data = new Date();
    var totalBruto = itens.reduce(function (s, i) { return s + i.produto.preco * i.quantidade; }, 0);
    var _b = calcularDesconto(itens, data, forma), desconto = _b.valor, observacao = _b.observacao;
    var totalLiquido = Number((totalBruto - desconto).toFixed(2));
    var pedido = {
        id: nextPedidoId++,
        cliente: cliente,
        itens: itens,
        totalBruto: totalBruto,
        desconto: Number(desconto.toFixed(2)),
        totalLiquido: totalLiquido,
        data: data,
        formaPagamento: forma
    };
    if (observacao) {
        pedido.observacaoPromocao = observacao;
    }
    pedidos.push(pedido);
    cliente.historicoPedidosIds.push(pedido.id);
    imprimirRecibo(pedido);
    salvarCSV();
}
function imprimirRecibo(p) {
    console.log('\n===== RECIBO / COMPROVANTE =====');
    console.log("Pedido #".concat(p.id, "  Data: ").concat(formatarData(p.data), " ").concat(p.data.toLocaleTimeString()));
    console.log("Cliente: ".concat(p.cliente.nome, " (ID ").concat(p.cliente.id, ")"));
    console.log('Itens:');
    p.itens.forEach(function (i) {
        console.log(" - ".concat(i.produto.nome, " x").concat(i.quantidade, " = R$ ").concat((i.produto.preco * i.quantidade).toFixed(2)));
    });
    console.log("Total Bruto: R$ ".concat(p.totalBruto.toFixed(2)));
    console.log("Desconto: R$ ".concat(p.desconto.toFixed(2)).concat(p.observacaoPromocao ? ' (' + p.observacaoPromocao + ')' : ''));
    console.log("Total a Pagar: R$ ".concat(p.totalLiquido.toFixed(2), "  | Pagamento: ").concat(p.formaPagamento));
    console.log('================================\n');
}
function listarPedidos() {
    console.log('\n== Pedidos ==');
    if (pedidos.length === 0) {
        console.log('Nenhum pedido.');
        return;
    }
    pedidos.forEach(function (p) {
        console.log("Pedido ".concat(p.id, " | Cliente: ").concat(p.cliente.nome, " | Itens: ").concat(p.itens.length, " | Total: R$ ").concat(p.totalLiquido.toFixed(2), " | Data: ").concat(formatarData(p.data)));
    });
}
// ---------------- Relatórios ----------------
function relatorioPizzasPorDia() {
    console.log('\n== Relatório: Pizzas vendidas por dia ==');
    var mapa = {};
    for (var _i = 0, pedidos_2 = pedidos; _i < pedidos_2.length; _i++) {
        var pedido = pedidos_2[_i];
        var dia = formatarData(pedido.data);
        var qtdPizzas = pedido.itens.filter(function (i) { return i.produto.categoria === CategoriaProduto.Pizza; })
            .reduce(function (s, i) { return s + i.quantidade; }, 0);
        if (qtdPizzas > 0) {
            mapa[dia] = (mapa[dia] || 0) + qtdPizzas;
        }
    }
    if (Object.keys(mapa).length === 0) {
        console.log('Nenhuma pizza vendida ainda.');
        return;
    }
    for (var _a = 0, _b = Object.keys(mapa).sort(); _a < _b.length; _a++) {
        var dia = _b[_a];
        console.log("".concat(dia, ": ").concat(mapa[dia], " pizzas"));
    }
}
function relatorioPizzasPorMes() {
    console.log('\n== Relatório: Pizzas vendidas por mês ==');
    var mapa = {};
    for (var _i = 0, pedidos_3 = pedidos; _i < pedidos_3.length; _i++) {
        var pedido = pedidos_3[_i];
        var mes = formatarMes(pedido.data);
        var qtdPizzas = pedido.itens.filter(function (i) { return i.produto.categoria === CategoriaProduto.Pizza; })
            .reduce(function (s, i) { return s + i.quantidade; }, 0);
        if (qtdPizzas > 0) {
            mapa[mes] = (mapa[mes] || 0) + qtdPizzas;
        }
    }
    if (Object.keys(mapa).length === 0) {
        console.log('Nenhuma pizza vendida ainda.');
        return;
    }
    for (var _a = 0, _b = Object.keys(mapa).sort(); _a < _b.length; _a++) {
        var mes = _b[_a];
        console.log("".concat(mes, ": ").concat(mapa[mes], " pizzas"));
    }
}
// ---------------- Histórico de Compras Cliente ----------------
function mostrarHistoricoCliente() {
    listarClientes();
    var id = lerNumero('ID do cliente: ');
    var c = clientes.find(function (x) { return x.id === id; });
    if (!c) {
        console.log('Cliente não encontrado.');
        return;
    }
    console.log("\n== Hist\u00F3rico do Cliente ".concat(c.nome, " =="));
    if (c.historicoPedidosIds.length === 0) {
        console.log('Sem pedidos.');
        return;
    }
    var _loop_4 = function (idPedido) {
        var p = pedidos.find(function (pp) { return pp.id === idPedido; });
        if (!p)
            return "continue";
        var qtdItens = p.itens.reduce(function (s, i) { return s + i.quantidade; }, 0);
        console.log("Pedido ".concat(p.id, " | Data ").concat(formatarData(p.data), " | Itens ").concat(qtdItens, " | Total R$ ").concat(p.totalLiquido.toFixed(2)));
    };
    for (var _i = 0, _a = c.historicoPedidosIds; _i < _a.length; _i++) {
        var idPedido = _a[_i];
        _loop_4(idPedido);
    }
}
// ---------------- Menu Principal ----------------
function mostrarMenu() {
    console.log('\n===== Sistema Pizzaria =====');
    console.log('1. Cadastrar Cliente');
    console.log('2. Listar Clientes');
    console.log('3. Atualizar Cliente');
    console.log('4. Excluir Cliente');
    console.log('5. Cadastrar Produto');
    console.log('6. Listar Produtos');
    console.log('7. Atualizar Produto');
    console.log('8. Excluir Produto');
    console.log('9. Realizar Pedido');
    console.log('10. Listar Pedidos');
    console.log('11. Relatório Pizzas por Dia');
    console.log('12. Relatório Pizzas por Mês');
    console.log('13. Histórico de Compras de Cliente');
    console.log('0. Sair');
    console.log('(Dados persistidos em CSV na pasta data)');
}
function loopPrincipal() {
    while (true) {
        mostrarMenu();
        var op = readline.question('Escolha uma opcao: ').trim();
        switch (op) {
            case '1':
                cadastrarCliente();
                break;
            case '2':
                listarClientes();
                break;
            case '3':
                atualizarCliente();
                break;
            case '4':
                excluirCliente();
                break;
            case '5':
                cadastrarProduto();
                break;
            case '6':
                listarProdutos();
                break;
            case '7':
                atualizarProduto();
                break;
            case '8':
                excluirProduto();
                break;
            case '9':
                realizarPedido();
                break;
            case '10':
                listarPedidos();
                break;
            case '11':
                relatorioPizzasPorDia();
                break;
            case '12':
                relatorioPizzasPorMes();
                break;
            case '13':
                mostrarHistoricoCliente();
                break;
            case '0':
                console.log('Saindo...');
                return;
            default: console.log('Opção inválida.');
        }
    }
}
// Execução
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    console.log('Bem-vindo ao Sistema de Pizzaria!');
    loopPrincipal();
}
// Fim do arquivo
