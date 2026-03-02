<?php
include("conexion.php");
// CONSULTA PARA OBTENER LOS REGISTRO DE LA TABLA REGISTRO
$result = mysqli_query($conn, "SELECT * FROM registro");
if (!$result) {
    die("Error en la consulta: " . mysqli_error($conn));
}
// CALCULA EL TOTAL DE ACCIONES DEL REGISTRO GENERAL
$queryAcciones = mysqli_query($conn, "SELECT SUM(Acciones) AS total_acciones FROM registro");
$accionesRow = mysqli_fetch_assoc($queryAcciones);
$suma_acciones = $accionesRow['total_acciones'] ?? 0;
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Listado de Accionistas</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.5/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body style="background: linear-gradient(to right, #80deea, #a5d6a7);">
    <div class="container mt-5">
        <div class="d-flex align-items-center justify-content-center mb-4 gap-2">
            <a href="/control/principal.html" class="btn btn-outline-secondary">
            <i class="fas fa-arrow-left"></i>
            </a>
            <h2 style="font-family:Times New Roman; font-size:40px; margin: 0;">
            <div style="text-align: center;">
            <b>  LANDUNI S.A.</b>
            <b><u><br>LISTADO DE ACCIONISTAS</u></b>
            
            </div>
            </h2>
        </div>
        <table class="table table-bordered table-hover text-center">
            <!-- NOMBRE DE COLUMNAS EN EL LISTADO -->
			<thead class="table-success">
                <tr>
                    <th>Numero</th>
                    <th>Nombre</th>
                    <th>Identificación</th>
                    <th>Acciones</th>
                    <th>% Acciones</th>
                </tr>
            </thead>
			<!-- NOMBRES DE FILA PARA EL INCREMENTO DE DATOS -->
            <tbody>
                <?php while ($row = mysqli_fetch_assoc($result)): ?>
                    <tr>
                        <td><?= htmlspecialchars($row['Numero']) ?></td>
                        <td><?= htmlspecialchars($row['Accionista']) ?></td>
                        <td><?= htmlspecialchars($row['Identificacion']) ?></td>
                        <td><?= htmlspecialchars($row['Acciones']) ?></td>
                        <td><?= htmlspecialchars($row['Porcentaje']) ?>%</td>
                    </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    </div>
	<!-- MUESTRA EL TOTAL CALCULADO DE LAS ACCIONES DE TODOS LOS REGISTROS -->
	<div class="text-center mt-4" style="font-size:40px; font-family:Times New Roman;">
		<strong>TOTAL DE ACCIONES:</strong> $<?= round($suma_acciones) ?>
	</div>
</body>
</html>
<?php
// CIERRA LA CONEXION A LA BASE DE DATOS
mysqli_close($conn);
?>