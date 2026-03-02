<?php
include('conexion.php'); 

// ARRAY PARA ALMACENAR LAS RESPUESTAS DE LAS 4 PREGUNTAS
$allData = [];

for ($i = 1; $i <= 6; $i++) {
    // CONSULTA PARA OBTENER LOS VOTOS PARA CADA PREGUNTA
    $sql = "SELECT Votos_Si, Votos_No, Votos_Blanco FROM finalizar_votos WHERE id_pregunta = $i";
    $result = $conexion->query($sql);
    
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        
        // TOTAL DE VOTOS
        $totalVotos = $row['Votos_Si'] + $row['Votos_No'] + $row['Votos_Blanco'];
        
        // CALCULAR LOS PORCENTAJES
        $porcentajeSi = $totalVotos > 0 ? ($row['Votos_Si'] / $totalVotos) * 100 : 0;
        $porcentajeNo = $totalVotos > 0 ? ($row['Votos_No'] / $totalVotos) * 100 : 0;
        $porcentajeBlanco = $totalVotos > 0 ? ($row['Votos_Blanco'] / $totalVotos) * 100 : 0;

        // ALMACENAR LOS RESULTADOS DE CADA PREGUNTA
        $allData[] = [
            'Voto_Si' => round($porcentajeSi, 2), // REDONDEAMOS A 2 DECIMALES
            'Voto_No' => round($porcentajeNo, 2), 
            'Voto_Blanco' => round($porcentajeBlanco, 2)
        ];
    } else {
        // SI NO HAY DATOS ASIGNAMOS 0%
        $allData[] = [
            'Voto_Si' => 0,
            'Voto_No' => 0,
            'Voto_Blanco' => 0
        ];
    }
}

// ENVIAR LOS DATOS COMO JSON
echo json_encode($allData);

$conexion->close();
?>
