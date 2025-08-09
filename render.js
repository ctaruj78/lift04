// assets/js/render.js
export function renderLiftsTable(liftsToRender = [], targetTableBody) {
  targetTableBody.empty();

  if (!liftsToRender.length) {
    targetTableBody.html('<tr><td colspan="7" class="text-center">Ліфти не знайдено.</td></tr>');
    return;
  }

  const rows = liftsToRender.map(lift => `
    <tr>
      <td>${lift.id}</td>
      <td>${lift.address || '-'}</td>
      <td>${lift.serial || '-'}</td>
      <td>${lift.brand || '-'}</td>
      <td><span class="badge ${getStatusClass(lift.status)}">${getStatusText(lift.status)}</span></td>
      <td>${lift.client || '-'}</td>
      <td>
        <button class="btn btn-info btn-sm" data-action="details" data-id="${lift.id}" data-toggle="modal" data-target="#liftDetailsModal">Деталі</button>
        <button class="btn btn-warning btn-sm" data-action="edit" data-id="${lift.id}" data-toggle="modal" data-target="#liftModal">Ред./QR</button>
      </td>
    </tr>
  `).join('');
  targetTableBody.html(rows);

  // Ініціалізація DataTables
  targetTableBody.closest('table').DataTable({
    destroy: true, // Для повторної ініціалізації
    paging: true,
    searching: true,
    ordering: true,
    language: { url: '//cdn.datatables.net/plug-ins/1.10.25/i18n/Ukrainian.json' }
  });
}