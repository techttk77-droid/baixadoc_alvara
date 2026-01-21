import { useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import './PdfEditor.css';

const PdfEditor = () => {
  const [formData, setFormData] = useState({
    credor: '',
    cpfCnpj: '',
    advogado: '',
    processoNumero: '',
    valorReceber: '',
    descricao: '',
    parteContraria: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatarData = () => {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  const formatarDataExtenso = () => {
    const hoje = new Date();
    const dia = hoje.getDate();
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mes = meses[hoje.getMonth()];
    const ano = hoje.getFullYear();
    return `${dia} de ${mes} de ${ano}.`;
  };

  const formatarCPFCNPJ = (valor) => {
    const numbers = valor.replace(/\D/g, '');
    if (numbers.length <= 11) {
      // CPF: 000.000.000-00
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      // CNPJ: 00.000.000/0000-00
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const handleCPFCNPJChange = (e) => {
    const formatted = formatarCPFCNPJ(e.target.value);
    setFormData(prev => ({
      ...prev,
      cpfCnpj: formatted
    }));
  };

  const formatarValor = (valor) => {
    let numbers = valor.replace(/\D/g, '');
    if (!numbers) return '';
    
    // Permitir números grandes - sem limite
    numbers = numbers.padStart(3, '0'); // Garantir pelo menos 3 dígitos
    const inteiros = numbers.slice(0, -2);
    const centavos = numbers.slice(-2);
    
    const valorFormatado = `${parseInt(inteiros).toLocaleString('pt-BR')},${centavos}`;
    return `R$ ${valorFormatado}`;
  };

  const numeroParaExtenso = (valor) => {
    let numbers = valor.replace(/\D/g, '');
    if (!numbers) return '';
    
    numbers = numbers.padStart(3, '0');
    const inteiros = parseInt(numbers.slice(0, -2));
    const cents = parseInt(numbers.slice(-2));
    const amount = inteiros + (cents / 100);
    
    if (isNaN(amount) || amount === 0) return '';
    
    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dez = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
    
    const converterGrupo = (num) => {
      if (num === 0) return '';
      if (num < 10) return unidades[num];
      if (num < 20) return dez[num - 10];
      if (num < 100) {
        const d = Math.floor(num / 10);
        const u = num % 10;
        return dezenas[d] + (u > 0 ? ' e ' + unidades[u] : '');
      }
      if (num < 1000) {
        const c = Math.floor(num / 100);
        const resto = num % 100;
        if (num === 100) return 'cem';
        return centenas[c] + (resto > 0 ? ' e ' + converterGrupo(resto) : '');
      }
      return '';
    };
    
    let inteiro = Math.floor(amount);
    const centavos = Math.round((amount - inteiro) * 100);
    
    let extenso = '';
    
    // Milhões
    if (inteiro >= 1000000) {
      const milhoes = Math.floor(inteiro / 1000000);
      extenso += milhoes === 1 ? 'um milhão' : converterGrupo(milhoes) + ' milhões';
      inteiro = inteiro % 1000000;
      if (inteiro > 0) extenso += ' e ';
    }
    
    // Milhares
    if (inteiro >= 1000) {
      const milhares = Math.floor(inteiro / 1000);
      extenso += milhares === 1 ? 'mil' : converterGrupo(milhares) + ' mil';
      inteiro = inteiro % 1000;
      if (inteiro > 0) extenso += ' e ';
    }
    
    // Centenas
    if (inteiro > 0) {
      extenso += converterGrupo(inteiro);
    }
    
    // Adicionar "reais"
    const valorInteiro = Math.floor(amount);
    extenso += valorInteiro === 1 ? ' real' : ' reais';
    
    // Centavos
    if (centavos > 0) {
      extenso += ' e ' + converterGrupo(centavos);
      extenso += centavos === 1 ? ' centavo' : ' centavos';
    }
    
    return extenso.charAt(0).toUpperCase() + extenso.slice(1);
  };

  const handleValorChange = (e) => {
    const formatted = formatarValor(e.target.value);
    const extenso = numeroParaExtenso(e.target.value);
    
    setFormData(prev => ({
      ...prev,
      valorReceber: formatted,
      descricao: extenso
    }));
  };

  const gerarPDF = async () => {
    try {
      setLoading(true);

      // Criar um novo PDF do zero
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.5, 842]); // Tamanho A4
      const { width, height } = page.getSize();
      
      // Carregar fontes
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Carregar logos
      const logoSTJBytes = await fetch('/STJ.png').then(res => res.arrayBuffer());
      const logoSTJ = await pdfDoc.embedPng(logoSTJBytes);
      
      const assinaturaBytes = await fetch('/Ass.png').then(res => res.arrayBuffer());
      const assinatura = await pdfDoc.embedPng(assinaturaBytes);
      
      const brasaoBytes = await fetch('/images.png').then(res => res.arrayBuffer());
      const brasao = await pdfDoc.embedPng(brasaoBytes);

      const brasagua = await fetch('/Logo.png').then(res => res.arrayBuffer());
      const brasaguaImage = await pdfDoc.embedPng(brasagua); 
      
      const codigoBarrasBytes = await fetch('/CodBarra.png').then(res => res.arrayBuffer());
      const codigoBarras = await pdfDoc.embedPng(codigoBarrasBytes);
      
      const dataAtual = formatarData();
      const dataExtenso = formatarDataExtenso();

      // Adicionar certificado STJ no canto superior esquerdo (maior e mais acima)
      const stjDims = logoSTJ.scale(0.5);
      page.drawImage(logoSTJ, {
        x: 25,
        y: height - 75,
        width: stjDims.width,
        height: stjDims.height,
      });

      // Adicionar brasão no topo (centro)
      const brasaoTopDims = brasao.scale(0.55);
      page.drawImage(brasao, {
        x: (width - brasaoTopDims.width) / 2,
        y: height - 155,
        width: brasaoTopDims.width,
        height: brasaoTopDims.height,
      });

      // Adicionar brasão no centro como marca d'água
      const brasaoDims = brasaguaImage.scale(0.4);
      page.drawImage(brasaguaImage, {
        x: (width - brasaoDims.width) / 2,
        y: (height - brasaoDims.height) / 2 - 50,
        width: brasaoDims.width,
        height: brasaoDims.height,
        opacity: 0.04,
      });

      // Título principal - centralizado (em negrito)
      const tituloText = 'TRIBUNAL DE JUSTIÇA';
      const tituloWidth = font.widthOfTextAtSize(tituloText, 11);
      page.drawText(tituloText, {
        x: (width - tituloWidth) / 2,
        y: height - 160,
        size: 9.5,
        font: font,
        color: rgb(0, 0, 0),
      });

      const alvara1Text = 'ALVARÁ DE LIBERAÇÃO DE PAGAMENTO Nº: 0284748/202';
      const alvara1Width = font.widthOfTextAtSize(alvara1Text, 8.5);
      page.drawText(alvara1Text, {
        x: (width - alvara1Width) / 2,
        y: height - 170,
        size: 7.5,
        font: font,
        color: rgb(0, 0, 0),
      });

      const acaoText = 'AÇÃO: EXECUÇÃO DE SENTENÇA CNJ LEI.13.105';
      const acaoWidth = font.widthOfTextAtSize(acaoText, 8);
      page.drawText(acaoText, {
        x: (width - acaoWidth) / 2,
        y: height - 180,
        size: 7,
        font: font,
        color: rgb(0, 0, 0),
      });

      // Título do processo - centralizado
      const processoText = 'PROCESSO JUDICIAL ELETRÔNICO';
      const processoWidth = fontBold.widthOfTextAtSize(processoText, 15);
      page.drawText(processoText, {
        x: (width - processoWidth) / 2,
        y: height - 230,
        size: 15,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      const judText = 'Processo Judiciário';
      const judWidth = font.widthOfTextAtSize(judText, 10);
      page.drawText(judText, {
        x: (width - judWidth) / 2,
        y: height - 250,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });

      // Dados do credor
      let yPos = height - 300;
      
      page.drawText('Credor:', {
        x: 60,
        y: yPos,
        size: 10,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(formData.credor, {
        x: 115,
        y: yPos,
        size: 10,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      yPos -= 20;
      page.drawText('CPF/CNPJ:', {
        x: 60,
        y: yPos,
        size: 9,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(formData.cpfCnpj, {
        x: 125,
        y: yPos,
        size: 9,
        font: font,
        color: rgb(0, 0, 0),
      });

      page.drawText('Advogado(a):', {
        x: 250,
        y: yPos,
        size: 9,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(formData.advogado, {
        x: 325,
        y: yPos,
        size: 10,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      yPos -= 20;
      page.drawText('Processo Nº:', {
        x: 60,
        y: yPos,
        size: 9,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(formData.processoNumero, {
        x: 140,
        y: yPos,
        size: 9,
        font: font,
        color: rgb(0, 0, 0),
      });

      // Cumprimento de sentença (com fundo sombreado)
      yPos -= 40;
      
      // Desenhar retângulo cinza claro atrás do texto
      page.drawRectangle({
        x: 55,
        y: yPos - 5,
        width: 485,
        height: 22,
        color: rgb(0.9, 0.9, 0.9),
      });
      
      const textoCumprimento = 'Cumprimento de Sentença Contra: ';
      const larguraCumprimento = fontBold.widthOfTextAtSize(textoCumprimento, 11);
      
      page.drawText(textoCumprimento, {
        x: 60,
        y: yPos,
        size: 11,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(formData.parteContraria, {
        x: 60 + larguraCumprimento,
        y: yPos,
        size: 11,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      
      // Desenhar linha de sublinhado
      const larguraParteContraria = fontBold.widthOfTextAtSize(formData.parteContraria, 11);
      page.drawLine({
        start: { x: 60 + larguraCumprimento, y: yPos - 2 },
        end: { x: 60 + larguraCumprimento + larguraParteContraria, y: yPos - 2 },
        thickness: 1,
        color: rgb(0, 0, 0),
      });

      yPos -= 25;
      page.drawText('Assunto: Decisão Favorável', {
        x: 60,
        y: yPos,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });

      yPos -= 20;
      page.drawText('Situação: AUTORIZADO', {
        x: 60,
        y: yPos,
        size: 10,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      // Código de barras
      yPos -= 20;
      const codigoBarrasScale = 0.4;
      const codigoBarrasDims = codigoBarras.scale(codigoBarrasScale);
      page.drawImage(codigoBarras, {
        x: 60,
        y: yPos - codigoBarrasDims.height,
        width: codigoBarrasDims.width,
        height: codigoBarrasDims.height,
      });
      
      // Valor
      yPos -= codigoBarrasDims.height + 10;
      page.drawText(`Valor a Receber: ${formData.valorReceber}`, {
        x: 60,
        y: yPos,
        size: 12,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      // Descrição do valor por extenso
      yPos -= 25;
      if (formData.descricao) {
        const textoDescricao = `(${formData.descricao}) Será Depositado em Conta Corrente de Sua Titularidade Indicada no Ato da Liberação.`;
        
        // Quebrar texto manualmente em múltiplas linhas se necessário
        const palavras = textoDescricao.split(' ');
        let linhaAtual = '';
        const maxWidth = 475; // largura máxima em pontos
        
        palavras.forEach((palavra, index) => {
          const testeLinhaAtual = linhaAtual + (linhaAtual ? ' ' : '') + palavra;
          const largura = fontBold.widthOfTextAtSize(testeLinhaAtual, 9);
          
          if (largura > maxWidth && linhaAtual !== '') {
            // Desenhar linha atual
            page.drawText(linhaAtual, {
              x: 60,
              y: yPos,
              size: 9,
              font: fontBold,
              color: rgb(0, 0, 0),
            });
            yPos -= 15;
            linhaAtual = palavra;
          } else {
            linhaAtual = testeLinhaAtual;
          }
          
          // Desenhar última linha
          if (index === palavras.length - 1 && linhaAtual) {
            page.drawText(linhaAtual, {
              x: 60,
              y: yPos,
              size: 9,
              font: fontBold,
              color: rgb(0, 0, 0),
            });
            yPos -= 15;
          }
        });
      }

      // Texto sobre os autos
      yPos -= 10;
      const textoAutos = 'Os Autos Foram Encaminhados Pelo Tj À Vara da Fazenda para a Execução do Processo e Posteriormente Encaminhado para Vara Das Execuções Gerando o Processo de Finalização.';
      
      // Quebrar texto manualmente em múltiplas linhas se necessário
      const palavrasAutos = textoAutos.split(' ');
      let linhaAtualAutos = '';
      const maxWidth = 475;
      
      palavrasAutos.forEach((palavra, index) => {
        const testeLinhaAtual = linhaAtualAutos + (linhaAtualAutos ? ' ' : '') + palavra;
        const largura = font.widthOfTextAtSize(testeLinhaAtual, 9);
        
        if (largura > maxWidth && linhaAtualAutos !== '') {
          // Desenhar linha atual
          page.drawText(linhaAtualAutos, {
            x: 60,
            y: yPos,
            size: 9,
            font: font,
            color: rgb(0, 0, 0),
          });
          yPos -= 15;
          linhaAtualAutos = palavra;
        } else {
          linhaAtualAutos = testeLinhaAtual;
        }
        
        // Desenhar última linha
        if (index === palavrasAutos.length - 1 && linhaAtualAutos) {
          page.drawText(linhaAtualAutos, {
            x: 60,
            y: yPos,
            size: 9,
            font: font,
            color: rgb(0, 0, 0),
          });
          yPos -= 15;
        }
      });

      // Data
      yPos -= 40;
      page.drawText(dataExtenso, {
        x: 60,
        y: yPos,
        size: 9,
        font: font,
        color: rgb(0, 0, 0),
      });


      // Assinatura - centralizada e maior no fim do documento
      const assScale = 0.55;
      const assDims = assinatura.scale(assScale);
      page.drawImage(assinatura, {
        x: (width - assDims.width) / 2,
        y: 40,
        width: assDims.width,
        height: assDims.height,
      });

      // Textos do tribunal acima da assinatura (centralizados)
      const textoPoder = 'PODER JUDICIÁRIO';
      const textoTribunal = 'TJ – Tribunal de Justiça.';
      const larguraPoder = fontBold.widthOfTextAtSize(textoPoder, 10);
      const larguraTribunal = font.widthOfTextAtSize(textoTribunal, 9);
      
      page.drawText(textoPoder, {
        x: (width - larguraPoder) / 2,
        y: 40 + assDims.height + 15,
        size: 10,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(textoTribunal, {
        x: (width - larguraTribunal) / 2,
        y: 40 + assDims.height,
        size: 9,
        font: font,
        color: rgb(0, 0, 0),
      });

      // Salvar o PDF
      const pdfBytes = await pdfDoc.save();
      
      // Criar blob e fazer download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `alvara-${formData.processoNumero}.pdf`;
      link.click();
      
      window.URL.revokeObjectURL(url);
      
      alert('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Verifique se o arquivo tem campos de formulário ou está na pasta public.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.credor || !formData.cpfCnpj || !formData.advogado || 
        !formData.processoNumero || !formData.valorReceber || !formData.descricao || !formData.parteContraria) {
      alert('Por favor, preencha todos os campos!');
      return;
    }
    
    gerarPDF();
  };

  return (
    <div className="pdf-editor-container">
      <div className="header">
        <h1>📄 Editor de Alvará</h1>
        <p className="subtitle">Preencha os dados para gerar o documento</p>
      </div>

      <form onSubmit={handleSubmit} className="form-container">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="credor">Credor *</label>
            <input
              type="text"
              id="credor"
              name="credor"
              value={formData.credor}
              onChange={handleChange}
              placeholder="Nome completo do credor"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="cpfCnpj">CPF/CNPJ *</label>
            <input
              type="text"
              id="cpfCnpj"
              name="cpfCnpj"
              value={formData.cpfCnpj}
              onChange={handleCPFCNPJChange}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              maxLength="18"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="advogado">Advogado(a) *</label>
            <input
              type="text"
              id="advogado"
              name="advogado"
              value={formData.advogado}
              onChange={handleChange}
              placeholder="Nome do advogado responsável"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="processoNumero">Processo N° *</label>
            <input
              type="text"
              id="processoNumero"
              name="processoNumero"
              value={formData.processoNumero}
              onChange={handleChange}
              placeholder="0000000-00.0000.0.00.0000"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="parteContraria">Parte Contrária *</label>
            <input
              type="text"
              id="parteContraria"
              name="parteContraria"
              value={formData.parteContraria}
              onChange={handleChange}
              placeholder="Nome da parte contrária"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="valorReceber">Valor a Receber *</label>
            <input
              type="text"
              id="valorReceber"
              name="valorReceber"
              value={formData.valorReceber}
              onChange={handleValorChange}
              placeholder="R$ 0,00"
              required
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="descricao">Descrição *</label>
            <textarea
              id="descricao"
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              placeholder="Descrição do valor a receber (ex: Oitenta e nove mil oitocentos e noventa e oito reais e cinquenta centavos)"
              rows="3"
              required
              style={{ resize: 'vertical', fontFamily: 'inherit', padding: '8px', fontSize: '14px' }}
            />
          </div>
        </div>

        <div className="data-info">
          <strong>Data do documento:</strong> {formatarData()}
        </div>

        <button 
          type="submit" 
          className="submit-btn"
          disabled={loading}
        >
          {loading ? '⏳ Gerando PDF...' : '⬇️ Gerar e Baixar PDF'}
        </button>
      </form>

      <div className="instructions">
        <h3>ℹ️ Instruções:</h3>
        <ul>
          <li>Preencha todos os campos obrigatórios (*)</li>
          <li>O CPF/CNPJ será formatado automaticamente</li>
          <li>O valor será formatado em moeda (R$)</li>
          <li>A data atual será inserida automaticamente</li>
        </ul>
      </div>
    </div>
  );
};

export default PdfEditor;