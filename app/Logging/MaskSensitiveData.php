<?php

namespace App\Logging;

use Monolog\LogRecord;

class MaskSensitiveData
{
    public function __invoke(LogRecord $record): LogRecord
    {
        $message = $record->message;
        
        // Mask emails
        $message = preg_replace('/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i', '[EMAIL_MASKED]', $message);
        
        // Mask card numbers (rough pattern)
        $message = preg_replace('/\b(?:\d[ -]*?){13,16}\b/', '[CARD_MASKED]', $message);

        return $record->with(message: $message);
    }
}
