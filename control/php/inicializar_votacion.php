<?php
include("conexion.php");

// VERIFICAR CONEXION A LA BASE DE DATOS
if (!$conn) {
    die(json_encode(['error' => 'No se pudo conectar a la base de datos.']));
}

// LEER LOS ACCIONISTAS DENTRO DE LA TABLA ASISTENCIAS
$query = "SELECT numero, nombre, acciones FROM asistencias";
$result = mysqli_query($conn, $query);

$total_acciones = 0;
$accionistas = [];

while ($row = mysqli_fetch_assoc($result)) {
    $total_acciones += $row['acciones'];
    $accionistas[] = $row;
}

foreach ($accionistas as $key => $accionista) {
    $accionistas[$key]['porcentaje'] = round(($accionista['acciones'] / $total_acciones) * 100, 3);
}

// INICIALIZAR RESULTADOS
$resultados = [];

for ($i = 1; $i <= 4; $i++) {
    $tabla = "pregunta$i";
    $checkTable = "SHOW TABLES LIKE '$tabla'";
    $checkResult = mysqli_query($conn, $checkTable);
    if (mysqli_num_rows($checkResult) == 0) {
        // SI LA TABLA NO TIENE VALORES ASIGNAMOS VALORES POR DEFECTO
        $resultados[$i] = [
            "si" => 100,
            "no" => 0,
            "blanco" => 0
        ];
        continue;
    }

    $sql = "SELECT 
                SUM(Porcentaje_S) AS si,
                SUM(Porcentaje_N) AS no,
                SUM(Porcentaje_B) AS blanco
            FROM $tabla";

    $res = mysqli_query($conn, $sql);

    if ($res && mysqli_num_rows($res) > 0) {
        $fila = mysqli_fetch_assoc($res);
        $total = floatval($fila['si']) + floatval($fila['no']) + floatval($fila['blanco']);

        if ($total > 0) {
            $resultados[$i] = [
                "si" => round(floatval($fila['si']), 3),
                "no" => round(floatval($fila['no']), 3),
                "blanco" => round(floatval($fila['blanco']), 3)
            ];
        } else {
            // MOSTRAR POR DEFECTO 100% EN SI
            $resultados[$i] = [
                "si" => 100,
                "no" => 0,
                "blanco" => 0
            ];
        }
    } else {
        // SI NO HAY FILAS MOSTRAR POR DEFECTO 100% EN SI
        $resultados[$i] = [
            "si" => 100,
            "no" => 0,
            "blanco" => 0
        ];
    }
}

// DEVOLVER JSON
echo json_encode([
    "accionistas" => $accionistas,
    "total_acciones" => $total_acciones,
    "resultados" => $resultados
]);
?>
