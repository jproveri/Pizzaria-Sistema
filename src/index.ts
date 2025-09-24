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

// Declarações mínimas (sem depender de @types/node para manter o arquivo único simples)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare function require(name: string): any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;
declare const __dirname: string; // fornecido pelo Node em runtime
// Imports simples (tipados como any para evitar erros de types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fs: any = require('fs');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const path: any = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const readline = require('readline-sync') as typeof import('readline-sync');

// ---------------- Tipos / Modelos ----------------
enum CategoriaProduto {
	Pizza = 'Pizza',
	Refrigerante = 'Refrigerante',
	Sobremesa = 'Sobremesa',
	Outro = 'Outro'
}

enum FormaPagamento {
	Dinheiro = 'Dinheiro',
	Cartao = 'Cartao',
	Pix = 'Pix'
}

interface Cliente {
	id: number;
	nome: string;
	telefone: string;
	endereco: string;
	historicoPedidosIds: number[]; // ids de pedidos
}

interface Produto {
	id: number;
	nome: string;
	categoria: CategoriaProduto;
	preco: number; // em reais
	ativo: boolean;
}

interface ItemPedido {
	produto: Produto;
	quantidade: number;
}

interface Pedido {
	id: number;
	cliente: Cliente;
	itens: ItemPedido[];
	totalBruto: number;
	desconto: number; // valor em reais
	totalLiquido: number;
	data: Date;
	formaPagamento: FormaPagamento;
	observacaoPromocao?: string;
}

// ---------------- Armazenamento em memória ----------------
const clientes: Cliente[] = [];
const produtos: Produto[] = [];
const pedidos: Pedido[] = [];

// Geradores simples de ID incremental
let nextClienteId = 1;
let nextProdutoId = 1;
let nextPedidoId = 1;

// ---------------- Persistência em CSV ----------------
// Diretório de dados relativo ao arquivo (../data)
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const FILE_CLIENTES = path.join(DATA_DIR, 'clientes.csv');
const FILE_PRODUTOS = path.join(DATA_DIR, 'produtos.csv');
const FILE_PEDIDOS = path.join(DATA_DIR, 'pedidos.csv');
const FILE_ITENS = path.join(DATA_DIR, 'itens_pedido.csv');

function ensureDataDir() {
	if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function sanitize(text: string): string { return text.replace(/[\r\n;]/g, ' ').trim(); }

function salvarCSV() {
	ensureDataDir();
	// clientes.csv -> id;nome;telefone;endereco;historicoPedidosIds(|)
	fs.writeFileSync(FILE_CLIENTES,
		clientes.map(c => [c.id, sanitize(c.nome), sanitize(c.telefone), sanitize(c.endereco), c.historicoPedidosIds.join('|')].join(';')).join('\n'), 'utf-8');
	// produtos.csv -> id;nome;categoria;preco;ativo
	fs.writeFileSync(FILE_PRODUTOS,
		produtos.map(p => [p.id, sanitize(p.nome), p.categoria, p.preco, p.ativo ? 1 : 0].join(';')).join('\n'), 'utf-8');
	// pedidos.csv -> id;idCliente;dataISO;totalBruto;desconto;totalLiquido;formaPagamento;obs
	fs.writeFileSync(FILE_PEDIDOS,
		pedidos.map(p => [p.id, p.cliente.id, p.data.toISOString(), p.totalBruto, p.desconto, p.totalLiquido, p.formaPagamento, sanitize(p.observacaoPromocao || '')].join(';')).join('\n'), 'utf-8');
	// itens_pedido.csv -> idPedido;idProduto;quantidade;precoUnit
	const itens: string[] = [];
	for (const ped of pedidos) {
		for (const it of ped.itens) {
			itens.push([ped.id, it.produto.id, it.quantidade, it.produto.preco].join(';'));
		}
	}
	fs.writeFileSync(FILE_ITENS, itens.join('\n'), 'utf-8');
}

function carregarCSV() {
	if (!fs.existsSync(DATA_DIR)) return;
	try {
		// Produtos
		if (fs.existsSync(FILE_PRODUTOS)) {
			const linhas: string[] = String(fs.readFileSync(FILE_PRODUTOS, 'utf-8')).split(/\r?\n/).filter((l: string) => l.trim());
					for (const l of linhas) {
						const [idStr, nomeRaw, categoriaRaw, precoStr, ativoStr] = l.split(';');
						const nome = nomeRaw || 'SemNome';
						const categoria = (categoriaRaw as CategoriaProduto) || CategoriaProduto.Outro;
						produtos.push({ id: Number(idStr || '0'), nome, categoria, preco: Number(precoStr || '0'), ativo: ativoStr === '1' });
			}
			nextProdutoId = produtos.reduce((m, p) => p.id > m ? p.id : m, 0) + 1;
		}
		// Clientes
		if (fs.existsSync(FILE_CLIENTES)) {
			const linhas: string[] = String(fs.readFileSync(FILE_CLIENTES, 'utf-8')).split(/\r?\n/).filter((l: string) => l.trim());
					for (const l of linhas) {
						const [idStr, nomeRaw, telefoneRaw, enderecoRaw, histStr] = l.split(';');
						const nome = nomeRaw || 'Cliente';
						const telefone = telefoneRaw || '';
						const endereco = enderecoRaw || '';
						clientes.push({ id: Number(idStr || '0'), nome, telefone, endereco, historicoPedidosIds: histStr ? histStr.split('|').filter((x: string) => x).map(Number) : [] });
			}
			nextClienteId = clientes.reduce((m, c) => c.id > m ? c.id : m, 0) + 1;
		}
		// Pedidos
		const pedidosBase: Record<number, Pedido> = {};
		if (fs.existsSync(FILE_PEDIDOS)) {
			const linhas: string[] = String(fs.readFileSync(FILE_PEDIDOS, 'utf-8')).split(/\r?\n/).filter((l: string) => l.trim());
					for (const l of linhas) {
						const [idStr, idClienteStr, dataISO, totalBrutoStr, descontoStr, totalLiquidoStr, formaStr, obsRaw] = l.split(';');
						const id = Number(idStr || '0');
						const cli = clientes.find(c => c.id === Number(idClienteStr || '-1'));
						if (!cli) continue;
						const pedido: Pedido = {
							id,
							cliente: cli,
							itens: [],
							totalBruto: Number(totalBrutoStr || '0'),
							desconto: Number(descontoStr || '0'),
							totalLiquido: Number(totalLiquidoStr || '0'),
							data: new Date(dataISO || new Date().toISOString()),
							formaPagamento: (formaStr as FormaPagamento) || FormaPagamento.Dinheiro
						};
						if (obsRaw) pedido.observacaoPromocao = obsRaw;
						pedidosBase[id] = pedido;
			}
		}
		// Itens
		if (fs.existsSync(FILE_ITENS)) {
			const linhas: string[] = String(fs.readFileSync(FILE_ITENS, 'utf-8')).split(/\r?\n/).filter((l: string) => l.trim());
			for (const l of linhas) {
				const [idPedidoStr, idProdutoStr, qtdStr] = l.split(';');
				const pedido = pedidosBase[Number(idPedidoStr)];
				const prod = produtos.find(p => p.id === Number(idProdutoStr));
				if (pedido && prod) {
					pedido.itens.push({ produto: prod, quantidade: Number(qtdStr) });
				}
			}
		}
			for (const idStr of Object.keys(pedidosBase)) {
				const ped = pedidosBase[Number(idStr)];
				if (ped) pedidos.push(ped);
		}
		nextPedidoId = pedidos.reduce((m, p) => p.id > m ? p.id : m, 0) + 1;
	} catch (e) {
		console.log('Erro ao carregar CSV:', e);
	}
}

carregarCSV();
if (produtos.length === 0) {
	salvarCSV();
}
// --------------------------------------------------

// ---------------- Utilidades ----------------
function lerNumero(pergunta: string): number {
	while (true) {
		const entrada = readline.question(pergunta).trim().replace(',', '.');
		const n = Number(entrada);
		if (!isNaN(n)) return n;
		console.log('Valor inválido. Tente novamente.');
	}
}

function lerOpcaoLista<T>(arr: T[], pergunta: string): number {
	while (true) {
		const n = lerNumero(pergunta);
		if (n >= 1 && n <= arr.length) return n - 1;
		console.log('Opção inválida.');
	}
}

function formatarData(d: Date): string {
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

function formatarMes(d: Date): string {
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	return `${yyyy}-${mm}`;
}

// ---------------- CRUD Clientes ----------------
function cadastrarCliente() {
	console.log('\n== Cadastrar Cliente ==');
	const nome = readline.question('Nome: ').trim();
	const telefone = readline.question('Telefone: ').trim();
	const endereco = readline.question('Endereco: ').trim();
	const cliente: Cliente = { id: nextClienteId++, nome, telefone, endereco, historicoPedidosIds: [] };
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
	clientes.forEach(c => {
		console.log(`ID ${c.id} | ${c.nome} | Tel: ${c.telefone} | End: ${c.endereco} | Pedidos: ${c.historicoPedidosIds.length}`);
	});
}

function atualizarCliente() {
	listarClientes();
	const id = lerNumero('ID do cliente para atualizar: ');
	const c = clientes.find(x => x.id === id);
	if (!c) {
		console.log('Cliente não encontrado.');
		return;
	}
	const novoNome = readline.question(`Nome (${c.nome}): `).trim();
	const novoTel = readline.question(`Telefone (${c.telefone}): `).trim();
	const novoEnd = readline.question(`Endereco (${c.endereco}): `).trim();
	if (novoNome) c.nome = novoNome;
	if (novoTel) c.telefone = novoTel;
	if (novoEnd) c.endereco = novoEnd;
	console.log('Atualizado.');
	salvarCSV();
}

function excluirCliente() {
	listarClientes();
	const id = lerNumero('ID do cliente para excluir: ');
	const idx = clientes.findIndex(c => c.id === id);
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
	console.log('\n== Cadastrar Produto ==');
	const nome = readline.question('Nome: ').trim();
	console.log('Categorias:');
	const categorias = Object.values(CategoriaProduto);
	categorias.forEach((c, i) => console.log(`${i + 1}. ${c}`));
	const catIdx = lerOpcaoLista(categorias, 'Escolha categoria (numero): ');
	const preco = lerNumero('Preço (ex: 39.90): ');
		const categoriaEscolhida = categorias[catIdx] ?? CategoriaProduto.Outro; // fallback
		const produto: Produto = { id: nextProdutoId++, nome, categoria: categoriaEscolhida, preco, ativo: true };
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
	produtos.forEach(p => {
		console.log(`ID ${p.id} | ${p.nome} | ${p.categoria} | R$ ${p.preco.toFixed(2)} | ${(p.ativo ? 'Ativo' : 'Inativo')}`);
	});
}

function atualizarProduto() {
	listarProdutos();
	const id = lerNumero('ID do produto para atualizar: ');
	const p = produtos.find(x => x.id === id);
	if (!p) { console.log('Não encontrado.'); return; }
	const novoNome = readline.question(`Nome (${p.nome}): `).trim();
	if (novoNome) p.nome = novoNome;
	const novoPrecoStr = readline.question(`Preço (${p.preco}): `).trim();
	if (novoPrecoStr) {
		const val = Number(novoPrecoStr.replace(',', '.'));
		if (!isNaN(val)) p.preco = val;
	}
	const mudarStatus = readline.question('Alterar status ativo? (s/n): ').trim().toLowerCase();
	if (mudarStatus === 's') p.ativo = !p.ativo;
	console.log('Produto atualizado.');
	salvarCSV();
}

function excluirProduto() {
	listarProdutos();
	const id = lerNumero('ID do produto para excluir: ');
	const idx = produtos.findIndex(p => p.id === id);
	if (idx === -1) { console.log('Não encontrado.'); return; }
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
function calcularDesconto(itens: ItemPedido[], data: Date, forma: FormaPagamento): { valor: number; observacao: string } {
	let desconto = 0;
	let observacoes: string[] = [];
	const pizzas = itens.filter(i => i.produto.categoria === CategoriaProduto.Pizza);
	const totalPizzas = pizzas.reduce((s, i) => s + i.produto.preco * i.quantidade, 0);
	const qtdPizzas = pizzas.reduce((s, i) => s + i.quantidade, 0);
	if (qtdPizzas >= 3) {
		const d = totalPizzas * 0.10;
		desconto += d;
		observacoes.push('Promoção 3+ pizzas (10%)');
	}
	if (data.getDay() === 3 && totalPizzas > 0) { // quarta-feira
		const d = totalPizzas * 0.05;
		desconto += d;
		observacoes.push('Quarta da Pizza (5%)');
	}
	const totalBruto = itens.reduce((s, i) => s + i.produto.preco * i.quantidade, 0);
	if (forma === FormaPagamento.Pix && totalBruto > 100) {
		const d = totalBruto * 0.02;
		desconto += d;
		observacoes.push('PIX acima de 100 (2%)');
	}
	return { valor: desconto, observacao: observacoes.join('; ') };
}

// ---------------- Pedidos ----------------
function realizarPedido() {
	console.log('\n== Novo Pedido ==');
	if (clientes.length === 0) { console.log('Cadastre clientes primeiro.'); return; }
	if (produtos.filter(p => p.ativo).length === 0) { console.log('Cadastre produtos ativos.'); return; }

	listarClientes();
	const idCliente = lerNumero('ID do cliente: ');
	const cliente = clientes.find(c => c.id === idCliente);
	if (!cliente) { console.log('Cliente não encontrado.'); return; }

	const itens: ItemPedido[] = [];
	while (true) {
		listarProdutos();
		const idProduto = lerNumero('ID do produto (0 para finalizar seleção): ');
		if (idProduto === 0) break;
		const produto = produtos.find(p => p.id === idProduto && p.ativo);
		if (!produto) { console.log('Produto inválido ou inativo.'); continue; }
		const qtd = lerNumero('Quantidade: ');
		if (qtd <= 0) { console.log('Qtd inválida.'); continue; }
		itens.push({ produto, quantidade: qtd });
		const mais = readline.question('Adicionar mais itens? (s/n): ').trim().toLowerCase();
		if (mais !== 's') break;
	}
	if (itens.length === 0) { console.log('Nenhum item adicionado. Pedido cancelado.'); return; }

	console.log('Formas de Pagamento:');
	const formas = Object.values(FormaPagamento);
	formas.forEach((f, i) => console.log(`${i + 1}. ${f}`));
	const idxForma = lerOpcaoLista(formas, 'Escolha (numero): ');
		const forma = formas[idxForma] ?? FormaPagamento.Dinheiro;

	const data = new Date();
	const totalBruto = itens.reduce((s, i) => s + i.produto.preco * i.quantidade, 0);
	const { valor: desconto, observacao } = calcularDesconto(itens, data, forma);
	const totalLiquido = Number((totalBruto - desconto).toFixed(2));

			const pedido: Pedido = {
				id: nextPedidoId++,
				cliente,
				itens,
				totalBruto,
				desconto: Number(desconto.toFixed(2)),
				totalLiquido,
				data,
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

function imprimirRecibo(p: Pedido) {
	console.log('\n===== RECIBO / COMPROVANTE =====');
	console.log(`Pedido #${p.id}  Data: ${formatarData(p.data)} ${p.data.toLocaleTimeString()}`);
	console.log(`Cliente: ${p.cliente.nome} (ID ${p.cliente.id})`);
	console.log('Itens:');
	p.itens.forEach(i => {
		console.log(` - ${i.produto.nome} x${i.quantidade} = R$ ${(i.produto.preco * i.quantidade).toFixed(2)}`);
	});
	console.log(`Total Bruto: R$ ${p.totalBruto.toFixed(2)}`);
	console.log(`Desconto: R$ ${p.desconto.toFixed(2)}${p.observacaoPromocao ? ' (' + p.observacaoPromocao + ')' : ''}`);
	console.log(`Total a Pagar: R$ ${p.totalLiquido.toFixed(2)}  | Pagamento: ${p.formaPagamento}`);
	console.log('================================\n');
}

function listarPedidos() {
	console.log('\n== Pedidos ==');
	if (pedidos.length === 0) { console.log('Nenhum pedido.'); return; }
	pedidos.forEach(p => {
		console.log(`Pedido ${p.id} | Cliente: ${p.cliente.nome} | Itens: ${p.itens.length} | Total: R$ ${p.totalLiquido.toFixed(2)} | Data: ${formatarData(p.data)}`);
	});
}

// ---------------- Relatórios ----------------
function relatorioPizzasPorDia() {
	console.log('\n== Relatório: Pizzas vendidas por dia ==');
	const mapa: Record<string, number> = {};
	for (const pedido of pedidos) {
		const dia = formatarData(pedido.data);
		const qtdPizzas = pedido.itens.filter(i => i.produto.categoria === CategoriaProduto.Pizza)
			.reduce((s, i) => s + i.quantidade, 0);
		if (qtdPizzas > 0) {
			mapa[dia] = (mapa[dia] || 0) + qtdPizzas;
		}
	}
	if (Object.keys(mapa).length === 0) { console.log('Nenhuma pizza vendida ainda.'); return; }
	for (const dia of Object.keys(mapa).sort()) {
		console.log(`${dia}: ${mapa[dia]} pizzas`);
	}
}

function relatorioPizzasPorMes() {
	console.log('\n== Relatório: Pizzas vendidas por mês ==');
	const mapa: Record<string, number> = {};
	for (const pedido of pedidos) {
		const mes = formatarMes(pedido.data);
		const qtdPizzas = pedido.itens.filter(i => i.produto.categoria === CategoriaProduto.Pizza)
			.reduce((s, i) => s + i.quantidade, 0);
		if (qtdPizzas > 0) {
			mapa[mes] = (mapa[mes] || 0) + qtdPizzas;
		}
	}
	if (Object.keys(mapa).length === 0) { console.log('Nenhuma pizza vendida ainda.'); return; }
	for (const mes of Object.keys(mapa).sort()) {
		console.log(`${mes}: ${mapa[mes]} pizzas`);
	}
}

// ---------------- Histórico de Compras Cliente ----------------
function mostrarHistoricoCliente() {
	listarClientes();
	const id = lerNumero('ID do cliente: ');
	const c = clientes.find(x => x.id === id);
	if (!c) { console.log('Cliente não encontrado.'); return; }
	console.log(`\n== Histórico do Cliente ${c.nome} ==`);
	if (c.historicoPedidosIds.length === 0) { console.log('Sem pedidos.'); return; }
	for (const idPedido of c.historicoPedidosIds) {
		const p = pedidos.find(pp => pp.id === idPedido);
		if (!p) continue;
		const qtdItens = p.itens.reduce((s, i) => s + i.quantidade, 0);
		console.log(`Pedido ${p.id} | Data ${formatarData(p.data)} | Itens ${qtdItens} | Total R$ ${p.totalLiquido.toFixed(2)}`);
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
		const op = readline.question('Escolha uma opcao: ').trim();
		switch (op) {
			case '1': cadastrarCliente(); break;
			case '2': listarClientes(); break;
			case '3': atualizarCliente(); break;
			case '4': excluirCliente(); break;
			case '5': cadastrarProduto(); break;
			case '6': listarProdutos(); break;
			case '7': atualizarProduto(); break;
			case '8': excluirProduto(); break;
			case '9': realizarPedido(); break;
			case '10': listarPedidos(); break;
			case '11': relatorioPizzasPorDia(); break;
			case '12': relatorioPizzasPorMes(); break;
			case '13': mostrarHistoricoCliente(); break;
			case '0': console.log('Saindo...'); return;
			default: console.log('Opção inválida.');
		}
	}
}

// Execução
if (typeof require !== 'undefined' && typeof module !== 'undefined' && (require as any).main === module) {
	console.log('Bem-vindo ao Sistema de Pizzaria!');
	loopPrincipal();
}

// Fim do arquivo
