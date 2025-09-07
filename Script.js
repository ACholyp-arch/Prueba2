// Lista de invitados con pases asignados
const listaInvitados = {
  "juan perez": 2,
  "maría lópez": 4,
  "familia garcía": 5,
  "pedro ramírez": 1,
  "ana martinez": 3
};

// Función para normalizar texto (quita tildes y pone minúsculas)
function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); 
}

function verificarInvitado() {
  const nombreInput = document.getElementById("nombre").value.trim();
  const resultado = document.getElementById("resultado");

  const nombreNormalizado = normalizarTexto(nombreInput);

  let encontrado = false;
  for (let nombre in listaInvitados) {
    if (normalizarTexto(nombre) === nombreNormalizado) {
      resultado.innerText = `✅ Tu invitación es válida para ${listaInvitados[nombre]} persona(s).`;
      encontrado = true;
      break;
    }
  }

  if (!encontrado) {
    resultado.innerText = "❌ Lo sentimos, no encontramos tu nombre en la lista.";
  }
}