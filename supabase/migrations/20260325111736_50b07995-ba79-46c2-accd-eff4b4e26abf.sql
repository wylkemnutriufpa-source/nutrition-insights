
UPDATE nutritionist_patients 
SET journey_status = 'awaiting_payment' 
WHERE journey_status = 'invited' AND status = 'active';
