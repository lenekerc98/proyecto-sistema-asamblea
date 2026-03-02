<?php
include("conexion.php");
// CONSULTA PARA OBTENER LOS DATOS DE LOS REGISTROS DE LA TABLA ASISTENCIAS
$result = mysqli_query($conn, "SELECT * FROM asistencias");
if (!$result) {
    die("Error en la consulta: " . mysqli_error($conn));
}
// CALCULA EL TOTAL DE ACCIONES DE LOS QUE ASISTIERON
$queryAcciones = mysqli_query($conn, "SELECT SUM(Acciones) AS total_acciones FROM asistencias WHERE Asistio = 1");
$accionesRow = mysqli_fetch_assoc($queryAcciones);
$suma_acciones = $accionesRow['total_acciones'] ?? 0;
// CALCULA EL PORCENTAJE DE ASISTENCIA POR ACCIONES
$total_acciones_empresa = 17657950;
$porcentaje = 0;
if ($total_acciones_empresa > 0) {
    $porcentaje = ($suma_acciones / $total_acciones_empresa) * 100;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Listado de Asistencia</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.5/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body style="background: linear-gradient(to right, #b3e5fc, #dcdcdc);">
    <div class="container mt-5">
        <div class="d-flex align-items-center justify-content-center mb-4 gap-2">
            <a href="/control/principal.html" class="btn btn-outline-secondary">
            <i class="fas fa-arrow-left"></i>
            </a>
            <h2 style="font-family:Times New Roman; font-size:50px; margin: 0;">
            <b><u>LISTADO DE ASISTENCIA</u></b>
            </h2>
        </div>
		 <!-- SE MUESTRA EL PORCENTAJE DE ASISTENCIAS -->
        <div class="text-center mt-4" style="font-size:40px; font-family:Times New Roman;">
            <strong>PORCENTAJE DE ASISTENCIA:</strong> <b><?= round($porcentaje, 3) ?>%</b>
        </div>
        <table class="table table-bordered table-striped table-hover text-center">
            <thead class="table-success">
				<!-- NOMBRES DE COLUMNAS -->
                <tr>
                    <th style="background:#7abad2; font-family:Times New Roman; font-size:20px;">Numero</th>
                    <th style="background:#7abad2; font-family:Times New Roman; font-size:20px;">Nombre</th>
                    <th style="background:#7abad2; font-family:Times New Roman; font-size:20px;">Identificación</th>
                    <th style="background:#7abad2; font-family:Times New Roman; font-size:20px;">Acciones</th>
                    <th style="background:#7abad2; font-family:Times New Roman; font-size:20px;">% Acciones</th>
                    <th style="background:#7abad2; font-family:Times New Roman; font-size:20px;">Asistió</th>
					<th style="background:#7abad2; font-family:Times New Roman; font-size:20px;">Observaciones</th>
                </tr>
            </thead>
            <tbody>
                <?php while ($row = mysqli_fetch_assoc($result)): ?>
                    <!-- NOMBRES DE FILAS -->
					<tr>
                        <td><?= htmlspecialchars($row['Numero']) ?></td>
                        <td><?= htmlspecialchars($row['Nombre']) ?></td>
                        <td><?= htmlspecialchars($row['Identificacion']) ?></td>
                        <td><?= htmlspecialchars($row['Acciones']) ?></td>
                        <td><?= htmlspecialchars($row['Porcentaje']) ?>%</td>
                        <td><?= ($row['Asistio'] == 1) ? 'Sí' : 'No' ?></td>
                        <td><?= htmlspecialchars($row['Observaciones']) ?></td>
                    </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    </div>
</body>
</html>
<?php
// CIERRA LA CONEXION A LA BASE DE DATOS
mysqli_close($conn);
?>