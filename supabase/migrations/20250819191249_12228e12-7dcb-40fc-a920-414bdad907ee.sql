UPDATE trade_alerts SET 
  status = 'closed',
  close_reason = 'manual',
  updated_at = now()
WHERE id IN ('db25976e-6855-4fd5-b6ff-8d9521de3d7b', '83303fce-ec05-4223-80ea-ec89791126f3')
AND status = 'active';