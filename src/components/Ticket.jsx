  const generarTextoQR = (r) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/#/reservas?id=${r.id}`;
  };