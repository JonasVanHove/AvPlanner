# Buddy Battle Integratie Handleiding

## 🎮 Overzicht

Deze handleiding beschrijft hoe je de Buddy Battle gamification integreert met de bestaande AvPlanner functionaliteit.

## 📦 Benodigde Imports

```typescript
import { useBuddyPoints } from '@/hooks/use-buddy-points';
import { PointsAwardedToastSimple } from '@/components/buddy-battle';
```

## 🔌 Integratie met Availability Calendar

### 1. Hook toevoegen aan component

In `availability-calendar-redesigned.tsx` of `availability-calendar.tsx`:

```typescript
// Bestaande imports...
import { useBuddyPoints, PointsAwardResult } from '@/hooks/use-buddy-points';
import { PointsAwardedToastSimple } from '@/components/buddy-battle';

export function AvailabilityCalendar({ teamId, members, locale }: AvailabilityCalendarProps) {
  // Bestaande state...
  
  // NIEUW: Buddy Battle integratie
  const { awardPoints, isAwarding, lastAward } = useBuddyPoints();
  const [pointsResult, setPointsResult] = useState<PointsAwardResult | null>(null);
  
  // ...bestaande code...
```

### 2. updateAvailability functie aanpassen

Pas de `updateAvailability` functie aan om punten toe te kennen:

```typescript
const updateAvailability = async (
  memberId: string, 
  date: string, 
  status: Availability["status"]
) => {
  // Bestaande upsert code...
  const { error } = await supabase
    .from("availability")
    .upsert({
      team_id: teamId,
      member_id: memberId,
      date,
      status,
    }, {
      onConflict: "team_id,member_id,date",
    });

  if (!error) {
    // NIEUW: Ken punten toe voor beschikbaarheid
    // Check of dit de ingelogde gebruiker is
    const { data: { user } } = await supabase.auth.getUser();
    const member = members.find(m => m.id === memberId);
    
    if (user && member && member.user_id === user.id) {
      // Check of het een feestdag is
      const isHoliday = status === 'holiday' || await checkIfHoliday(date);
      
      // Ken punten toe
      const result = await awardPoints(user.id, teamId, date, isHoliday);
      
      if (result.pointsAwarded > 0) {
        setPointsResult(result);
      }
    }
  }
};
```

### 3. Toast component toevoegen

Voeg de toast toe aan de return statement:

```tsx
return (
  <>
    {/* Bestaande calendar JSX... */}
    <Card>
      {/* ... */}
    </Card>
    
    {/* NIEUW: Points notification toast */}
    <PointsAwardedToastSimple 
      result={pointsResult}
      onClose={() => setPointsResult(null)}
      duration={3000}
    />
  </>
);
```

## 🔄 Integratie met Bulk Update Dialog

Voor de `bulk-update-dialog.tsx`:

```typescript
import { useBuddyPoints } from '@/hooks/use-buddy-points';

function BulkUpdateDialog({ teamId, memberId, userId, onUpdate }) {
  const { awardBulkPoints, isAwarding } = useBuddyPoints();
  
  const handleBulkSave = async (dates: string[], status: string) => {
    // Bestaande save logica...
    await saveBulkAvailability(dates, status);
    
    // Ken punten toe voor alle datums
    const holidays = await getHolidaysForDates(dates);
    const result = await awardBulkPoints(userId, teamId, dates, holidays);
    
    if (result.pointsAwarded > 0) {
      // Toon notification
      showToast(`+${result.pointsAwarded} coins earned!`);
    }
  };
}
```

## 🎯 Buddy Battle Link in Team Dashboard

Voeg de Buddy Battle link toe aan het team dashboard:

```tsx
import { BuddyBattleLink } from '@/components/buddy-battle';

function TeamDashboard({ teamId }) {
  return (
    <div>
      {/* Bestaande team content */}
      
      {/* Buddy Battle Quick Access */}
      <BuddyBattleLink teamId={teamId} variant="card" />
    </div>
  );
}
```

Of als menu item:

```tsx
import { BuddyBattleMenuItem } from '@/components/buddy-battle';

function NavigationMenu({ teamId }) {
  return (
    <nav>
      {/* Andere menu items */}
      <BuddyBattleMenuItem teamId={teamId} />
    </nav>
  );
}
```

## 📊 Database Trigger Alternatief

In plaats van client-side integratie, kun je ook een database trigger gebruiken:

```sql
-- Trigger die automatisch punten toekent bij availability insert/update
CREATE OR REPLACE FUNCTION award_points_on_availability()
RETURNS TRIGGER AS $$
DECLARE
  v_buddy_id UUID;
  v_is_holiday BOOLEAN;
  v_points INTEGER;
BEGIN
  -- Vind de buddy van deze gebruiker voor dit team
  SELECT id INTO v_buddy_id
  FROM player_buddies
  WHERE user_id = NEW.user_id AND team_id = NEW.team_id;
  
  IF v_buddy_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check of er al punten zijn toegekend voor deze datum
  IF EXISTS (
    SELECT 1 FROM point_transactions
    WHERE player_buddy_id = v_buddy_id
    AND source = 'availability'
    AND created_at::date = NEW.date
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Check of het een feestdag is
  v_is_holiday := NEW.status = 'holiday' OR EXISTS (
    SELECT 1 FROM holidays WHERE date = NEW.date AND team_id = NEW.team_id
  );
  
  -- Bereken punten
  v_points := CASE WHEN v_is_holiday THEN 2 ELSE 1 END;
  
  -- Ken punten toe
  UPDATE player_buddies
  SET coins = coins + v_points,
      total_points = total_points + v_points
  WHERE id = v_buddy_id;
  
  -- Log transactie
  INSERT INTO point_transactions (player_buddy_id, amount, source, description)
  VALUES (v_buddy_id, v_points, 'availability', 'Auto-awarded for availability on ' || NEW.date);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_award_availability_points
AFTER INSERT OR UPDATE ON availability
FOR EACH ROW
EXECUTE FUNCTION award_points_on_availability();
```

## ⚙️ Environment Variabelen

Zorg dat deze zijn ingesteld in `.env.local`:

```env
# Supabase (bestaand)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Buddy Battle Cron (voor Edge Functions)
CRON_SECRET=your-cron-secret-key
```

## 🧪 Testing

Test de integratie:

1. Open de availability calendar
2. Wijzig je beschikbaarheid voor een datum
3. Controleer of de coins toast verschijnt
4. Ga naar Buddy Battle en verifieer dat coins zijn toegevoegd

## 📝 Checklist

- [ ] `use-buddy-points.ts` hook importeren
- [ ] `PointsAwardedToastSimple` component toevoegen
- [ ] `updateAvailability` functie aanpassen
- [ ] Database triggers draaien (optioneel)
- [ ] BuddyBattleLink toevoegen aan team dashboard
- [ ] Testen in development
